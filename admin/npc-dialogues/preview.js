import {cityNameGuard,findCityFacts,buildDestinationLines} from '../../dialogues/DestinationClueText.js';
const TRAITS=new Set(['features','accent','hair','eyes','skills','habitus']);
export function previewLines({variant,kind,topic,value,targetId,facts,cityIds=[],scenario='correct',binding=null}){
 const guard=cityNameGuard(facts,cityIds),safe=v=>typeof v==='string'&&v.trim()&&guard.safe(v);
 if(scenario==='future'&&['topic','motive','falseLead'].includes(kind))return {lines:['You are ahead of the verified trail. Establish the missing stops first; this visit does not advance the case.'],note:'Przyszłe miasto: brak wskazówek.'};
 if(scenario==='wrong'&&['topic','motive','falseLead'].includes(kind))kind='falseLead';
 if(kind==='banter')return {lines:(variant.banter||[]).filter(safe),note:'Losowa wypowiedź small talk. Teksty zawierające nazwy miast są filtrowane przez grę.'};
 if(kind==='repeatLines'||kind==='falseLead'){const pairs=(variant[kind==='falseLead'?'falseLeadLines':'repeatLines']||[]).filter(p=>Array.isArray(p)&&p.every(safe));return {lines:pairs.map(p=>p.join(' ')),note:'Losowa para wypowiedzi.'};}
 if(kind==='motive')return {lines:binding?.text?[guard.clean(binding.text)]:[],note:binding?'Symulacja: właściwy motyw i etap, dozwolony NPC, poprawne miasto na trasie ucieczki (nie miejsce kradzieży). W grze wymagania sprawdza MotiveWitnessPolicy.':'Ten NPC nie ma przypisanego etapu dowodowego.'};
 if(TRAITS.has(topic)){const raw=variant.topics?.[topic]?.[value],pool=(Array.isArray(raw)?raw:typeof raw==='string'?[raw]:[]).filter(safe);const fallback={features:'A distinctive feature',accent:'Their accent',hair:'Their hair',eyes:'Their eyes',skills:'Observed skills',habitus:'Observed habits'}[topic];return {lines:[pool[0]||(safe(value)?`${fallback}: ${value}.`:`Nothing memorable about their ${topic}.`)],note:'Gra używa pierwszej bezpiecznej odpowiedzi pasującej do dokładnej wartości cechy złodzieja.'};}
 if(scenario==='last'||!targetId)return {lines:[],note:'Ostatnie miasto trasy: nie ma kolejnego celu ani wskazówki podróżnej.'};
 return {lines:buildDestinationLines({topicId:topic,facts:findCityFacts(facts,targetId),templates:Array.isArray(variant.topics?.[topic])?variant.topics[topic]:[],guard}),note:'Wskazówka opisuje następny cel podróży. Pokazujemy dostępne odpowiedzi; gra wybiera je deterministycznie dla miasta, celu i NPC.'};
}
