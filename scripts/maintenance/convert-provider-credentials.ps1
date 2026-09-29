param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
)
# Offline conversion only. The running application accepts the Nako format exclusively.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if ($sourcePath -eq $destinationPath -or (Test-Path -LiteralPath $destinationPath)) {
    throw 'Destination must be a new file; source credentials are never overwritten.'
}
$bytes = [System.IO.File]::ReadAllBytes($sourcePath)
$plaintext = $null
try {
    if ($bytes.Length -le 8 -or $bytes.Length -gt 262144) { throw 'Invalid credential file size.' }
    $magic = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 8)
    if ($magic -notin @('AFPCDP01', 'NKPCDP01')) { throw 'Unknown credential format.' }
    $payload = [byte[]]$bytes[8..($bytes.Length - 1)]
    $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    $newEntropy = [System.Text.Encoding]::UTF8.GetBytes('Nako.ProviderCredentials.v1')
    $candidates = @('Nako.ProviderCredentials.v1', 'Noko.ProviderCredentials.v1', 'AIFISHER.ProviderCredentials.v1')
    foreach ($candidate in $candidates) {
        try {
            $entropy = [System.Text.Encoding]::UTF8.GetBytes($candidate)
            $plaintext = [System.Security.Cryptography.ProtectedData]::Unprotect($payload, $entropy, $scope)
            break
        } catch { }
    }
    if ($null -eq $plaintext) { throw 'Unable to decrypt: use the original Windows account and computer.' }
    # Keep plaintext in memory only; never print credential contents.
    $protected = [System.Security.Cryptography.ProtectedData]::Protect($plaintext, $newEntropy, $scope)
    $output = [byte[]]([System.Text.Encoding]::ASCII.GetBytes('NKPCDP01') + $protected)
    $stream = [System.IO.File]::Open($destinationPath, [System.IO.FileMode]::CreateNew)
    try { $stream.Write($output, 0, $output.Length) } finally { $stream.Dispose() }
    Write-Output 'Nako encrypted credential copy created; original unchanged.'
} finally {
    if ($plaintext) { [Array]::Clear($plaintext, 0, $plaintext.Length) }
    if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
}
