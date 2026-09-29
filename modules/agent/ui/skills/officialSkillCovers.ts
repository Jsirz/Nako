import drama from './assets/official-drama.svg';
import high from './assets/official-drama-high.svg';
import fight from './assets/official-fight.svg';
const covers = new Map([['minimax-drama-prompt',drama],['minimax-drama-high',high],['minimax-fight-assets',fight]]);
export function officialSkillCover(skill: {slug:string;source?:string}):string|undefined{return skill.source==='official'?covers.get(skill.slug):undefined;}
