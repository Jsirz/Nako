const STYLE_ID = 'nako-skill-community-styles';
export function installSkillStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .nako-skill-overlay{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:28px;background:var(--nk-overlay);font-family:Inter,"Microsoft YaHei UI",system-ui,sans-serif}
    .nako-skill-dialog{width:min(1040px,calc(100vw - 56px));max-height:min(780px,calc(100vh - 56px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--nk-border);border-radius:18px;background:var(--nk-surface);color:var(--nk-text);box-shadow:var(--nk-shadow)}
    .nako-skill-head{display:flex;align-items:center;gap:18px;padding:24px 26px;border-bottom:1px solid var(--nk-border)}
    .nako-skill-title{margin:0;font-size:22px;line-height:1.2;font-weight:760;letter-spacing:-.02em}
    .nako-skill-subtitle{margin:6px 0 0;color:var(--nk-text-muted);font-size:13px}
    .nako-skill-actions{margin-left:auto;display:flex;align-items:center;gap:10px}
    .nako-skill-button{height:40px;padding:0 16px;border:1px solid var(--nk-border-control);border-radius:10px;background:var(--nk-surface);color:var(--nk-text);font-weight:650;cursor:pointer;white-space:nowrap;flex-shrink:0}
    .nako-skill-button:hover{border-color:var(--nk-border-control);background:var(--nk-surface-raised)}
    .nako-skill-button.is-primary{border-color:var(--nk-border-control);background:var(--nk-primary);color:var(--nk-on-primary)}
    .nako-skill-close{width:40px;padding:0;font-size:22px;font-weight:400}
    .nako-skill-body{min-height:min(260px,30vh);overflow:auto;padding:24px 26px 30px;scrollbar-width:thin;scrollbar-color:var(--nk-text-muted) var(--nk-on-primary)}
    .nako-skill-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));align-items:stretch;gap:16px}
    .nako-skill-card-group{height:100%;display:flex;flex-direction:column;min-width:0;border:1px solid var(--nk-border);border-radius:13px;overflow:hidden;background:var(--nk-surface)}
    .nako-skill-card-group .nako-skill-card{width:100%;border:0;border-radius:0}
    .nako-skill-card{width:100%;min-width:0;min-height:0;flex:1;display:flex;flex-direction:column;padding:0;overflow:hidden;border:1px solid var(--nk-border);border-radius:13px;background:var(--nk-surface);text-align:left;color:inherit;cursor:pointer}
    .nako-skill-cover{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:var(--nk-input)}
    .nako-skill-card-content{display:flex;flex:1;flex-direction:column;min-width:0;min-height:118px;padding:16px;overflow-wrap:anywhere}
    .nako-skill-card:hover{border-color:var(--nk-border-control);background:var(--nk-surface)}
    .nako-skill-command{font:700 12px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--nk-text-secondary)}
    .nako-skill-name{display:-webkit-box;overflow:hidden;-webkit-line-clamp:1;-webkit-box-orient:vertical;font-size:16px;line-height:22px;font-weight:720}
    .nako-skill-description{display:-webkit-box;min-height:60px;margin:8px 0 0;overflow:hidden;-webkit-line-clamp:3;-webkit-box-orient:vertical;color:var(--nk-text-secondary);font-size:13px;line-height:20px}
    .nako-skill-meta{margin-top:auto;color:var(--nk-text-muted);font-size:11px}
    .nako-skill-tabs{display:flex;gap:8px;padding:16px 26px 0}
    .nako-skill-tabs button[aria-pressed=true]{background:var(--nk-primary);color:var(--nk-on-primary)}
    .nako-skill-filters{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:16px 26px 0}
    .nako-skill-actions{flex-wrap:wrap;justify-content:flex-end}
    .nako-skill-filters input,.nako-skill-filters select,.nako-skill-card-controls input{min-width:0;max-width:100%;border:1px solid var(--nk-border-control);border-radius:8px;background:var(--nk-input);color:var(--nk-text);padding:8px;font:inherit}
    .nako-skill-filters input{flex:1;min-width:160px}
    .nako-skill-card-controls{display:flex;flex-wrap:wrap;gap:6px;padding:12px;border-top:1px solid var(--nk-border)}
    .nako-skill-card-controls input{width:100%}
    .nako-skill-card-controls button{height:32px;padding:0 10px;font-size:12px}
    .nako-skill-delete-confirm{width:100%;padding-top:8px;border-top:1px solid var(--nk-border)}
    .nako-skill-delete-confirm p{margin:0 0 8px;color:var(--nk-text-secondary);font-size:12px;line-height:1.6}
    .nako-skill-delete-confirm button{margin-right:6px}
    .nako-skill-command{margin-bottom:12px}
    .nako-skill-dialog [hidden]{display:none}
    .nako-skill-dialog button:focus-visible{outline:2px solid var(--nk-info);outline-offset:2px}
    .nako-skill-empty{padding:60px 20px;text-align:center;color:var(--nk-text-muted)}
    .nako-skill-message{padding:10px 26px;border-top:1px solid var(--nk-border);color:var(--nk-text-secondary);font-size:12px}
    .nako-skill-menu{position:fixed;z-index:10030;width:min(360px,calc(100vw - 24px));max-height:300px;overflow:auto;padding:8px;border:1px solid var(--nk-border);border-radius:12px;background:var(--nk-surface);color:var(--nk-text);box-shadow:var(--nk-shadow)}
    .nako-skill-menu button{width:100%;display:grid;grid-template-columns:minmax(0,1fr);gap:4px;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer}
    .nako-skill-menu button:hover,.nako-skill-menu button.is-active{background:var(--nk-surface-raised)}
    .nako-skill-menu strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
    .nako-skill-detail-overlay{position:fixed;inset:0;z-index:10100;display:grid;place-items:center;padding:24px;background:var(--nk-overlay);backdrop-filter:blur(7px)}
    .nako-skill-detail{position:relative;width:min(960px,100%);max-height:calc(100dvh - 48px);overflow:auto;border:1px solid var(--nk-border);border-radius:18px;background:var(--nk-surface);color:var(--nk-text);box-shadow:var(--nk-shadow)}
    .nako-skill-detail-hero{position:relative;display:flex;align-items:flex-end;min-height:300px;aspect-ratio:2.6/1;overflow:hidden;background:var(--nk-input)}
    .nako-skill-detail-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .nako-skill-detail-hero:after{position:absolute;inset:30% 0 0;content:'';background:linear-gradient(transparent,#000c);pointer-events:none}
    .nako-skill-detail-heading{position:relative;z-index:1;padding:28px 34px;color:white}
    .nako-skill-detail-heading h2{margin:0 0 10px;font-size:32px;line-height:1.2;font-weight:750;overflow-wrap:anywhere}
    .nako-skill-detail-heading span{color:#ffffffc9;font-size:13px}
    .nako-skill-detail-hero .nako-skill-close{position:absolute;z-index:2;right:16px;top:16px;width:38px;height:38px;border:1px solid #ffffff4a;border-radius:50%;background:#1118;color:white;font-size:24px;cursor:pointer}
    .nako-skill-detail-body{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;padding:22px 28px}
    .nako-skill-detail-section{padding:18px;border:1px solid var(--nk-border);border-radius:12px;background:var(--nk-surface-raised)}
    .nako-skill-detail-section h3{display:block;margin:0 0 10px;font-size:13px;color:var(--nk-text-muted)}
    .nako-skill-detail-section p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.7}
    .nako-skill-detail-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 28px 20px;border-top:1px solid var(--nk-border)}
    .nako-skill-import-dialog{display:flex;flex-direction:column;width:min(1120px,100%);max-height:calc(100dvh - 48px);overflow:hidden;border:1px solid var(--nk-border);border-radius:16px;background:var(--nk-surface);color:var(--nk-text);box-shadow:var(--nk-shadow)}
    .nako-skill-import-head{display:flex;align-items:center;justify-content:space-between;padding:20px 26px;border-bottom:1px solid var(--nk-border)}
    .nako-skill-import-head h2{margin:0;font-size:22px}.nako-skill-import-head p{margin:6px 0 0;color:var(--nk-text-muted);font-size:13px}
    .nako-skill-import-head .nako-skill-close{width:38px;height:38px;border:1px solid var(--nk-border);border-radius:9px;background:transparent;color:inherit;font-size:22px;cursor:pointer}
    .nako-skill-import-form{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.4fr);gap:16px;padding:22px 26px;overflow:auto}
    .nako-skill-import-field{display:flex;flex-direction:column;gap:8px;min-width:0;color:var(--nk-text-secondary);font-size:12px;font-weight:600}
    .nako-skill-import-field input,.nako-skill-import-field textarea{width:100%;min-width:0;border:1px solid var(--nk-border-control);border-radius:9px;background:var(--nk-input);color:var(--nk-text);padding:11px 12px;font:inherit;font-weight:400}
    .nako-skill-import-field textarea{height:100%;min-height:390px;resize:vertical;font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}
    .nako-skill-import-field:nth-child(5){grid-column:2;grid-row:1 / span 5;min-height:0}
    .nako-skill-import-sources{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
    .nako-skill-import-status{grid-column:1/-1;min-height:18px;margin:0;color:var(--nk-text-muted);font-size:12px;overflow-wrap:anywhere}
    .nako-skill-import-cover-row{display:flex;align-items:center;gap:10px;min-width:0}
    .nako-skill-import-cover{width:100px;height:64px;object-fit:cover;border:1px solid var(--nk-border);border-radius:8px;background:var(--nk-input)}
    .nako-skill-import-dialog .nako-skill-detail-footer{padding:14px 26px}
    .nako-skill-detail-overlay button:focus-visible{outline:2px solid var(--nk-info);outline-offset:2px}
    .nako-skill-editor{position:relative}.nako-skill-edit-form{display:flex;flex-direction:column;gap:18px;min-width:0;margin:0;padding:22px 26px;border:0;overflow:auto}
    .nako-skill-edit-metadata{display:grid;grid-template-columns:1fr 1fr;gap:14px}.nako-skill-edit-metadata label:nth-child(2){grid-column:1/-1;grid-row:2}.nako-skill-edit-metadata textarea{min-height:100px;resize:vertical}
    .nako-skill-edit-files{display:flex;flex-direction:column;gap:10px}.nako-skill-edit-files>textarea{min-height:300px;resize:vertical;font:13px/1.65 ui-monospace,Consolas,monospace}
    .nako-skill-editor input,.nako-skill-editor select,.nako-skill-edit-files>textarea{min-width:0;padding:10px;border:1px solid var(--nk-border-control);border-radius:8px;background:var(--nk-input);color:var(--nk-text)}
    .nako-skill-editor>.nako-skill-import-status{padding:10px 26px}
    .nako-skill-delete-overlay{z-index:10110}.nako-skill-delete-dialog{width:min(440px,100%)}.nako-skill-delete-dialog h2{margin:0;padding:24px 26px 0;font-size:20px}.nako-skill-delete-dialog p{margin:0;padding:14px 26px 24px;color:var(--nk-text-secondary);font-size:14px;line-height:1.7;overflow-wrap:anywhere}.nako-skill-delete-dialog .is-danger{color:var(--nk-error);border-color:var(--nk-error)}
    .nako-skill-editor .is-danger{margin-right:auto;color:var(--nk-error)}.nako-skill-editor button:disabled{opacity:.5;cursor:default}.nako-skill-edit-files textarea:disabled{min-height:100px}
    @media(max-width:680px){.nako-skill-edit-form{padding:16px}.nako-skill-edit-metadata{grid-template-columns:1fr}.nako-skill-edit-metadata label:nth-child(2){grid-row:auto}.nako-skill-edit-metadata textarea{min-height:100px}.nako-skill-editor .nako-skill-import-cover-row{flex-wrap:wrap}}
    @media(max-width:680px){.nako-skill-detail-overlay{padding:12px}.nako-skill-detail{max-height:calc(100dvh - 24px)}.nako-skill-detail-hero{min-height:220px;aspect-ratio:1.5/1}.nako-skill-detail-heading{padding:20px}.nako-skill-detail-heading h2{font-size:24px}.nako-skill-detail-body{grid-template-columns:1fr;padding:16px}.nako-skill-import-dialog{max-height:calc(100dvh - 24px)}.nako-skill-import-head{padding:16px}.nako-skill-import-form{grid-template-columns:1fr;padding:16px;gap:13px}.nako-skill-import-field:nth-child(5){grid-column:1;grid-row:auto}.nako-skill-import-field textarea{min-height:240px}.nako-skill-import-dialog .nako-skill-detail-footer{padding:12px 16px}}
    @media (max-width:680px){.nako-skill-overlay{padding:12px}.nako-skill-dialog{width:calc(100vw - 24px);max-height:calc(100vh - 24px)}.nako-skill-head{align-items:flex-start;padding:18px}.nako-skill-actions{gap:6px}.nako-skill-body{padding:18px}.nako-skill-subtitle{max-width:270px}}
    @media (max-width:480px){.nako-skill-head{position:relative;display:block}.nako-skill-head>div:first-child{padding-right:38px}.nako-skill-actions{margin:14px 0 0}.nako-skill-close{position:absolute;right:18px;top:18px}.nako-skill-tabs,.nako-skill-filters{padding-left:18px;padding-right:18px}}
  `;
  document.head.append(style);
}
