import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { getTicketAirportCode } from './TicketAirports.js';

export const ESCAPE_LEAD_VERSION=1;
const clean=value=>typeof value==='string'?value.trim():'';

export function createApartmentEscapeLead(target,random=Math.random) {
  if(!clean(target?.id) || !clean(target?.city) || !clean(target?.country) || target.id==='hq') {
    throw new Error('[ApartmentEscapeLeads] A valid first route city and country are required.');
  }
  const country=clean(target.country);
  const definitions=[
    {
      id:'escape_booking_note',label:__dialogueText("config/ApartmentEscapeLeads.js", "t_543b4ee713ae19048079"),
      description:__dialogueText("config/ApartmentEscapeLeads.js", "t_0247cdc978a57058cf65"),
      hint:`${__dialogueText("config/ApartmentEscapeLeads.js", "t_94a8a9dcfc8ca7d19128")}${country}${__dialogueText("config/ApartmentEscapeLeads.js", "t_91207ae1c100761e5aa9")}`,
      useMessage:__dialogueText("config/ApartmentEscapeLeads.js", "t_1ad3b06a843b708fcbdc")
    },
    {
      id:'escape_forwarding_slip',label:__dialogueText("config/ApartmentEscapeLeads.js", "t_d850b8a1de2eaa32d075"),
      description:__dialogueText("config/ApartmentEscapeLeads.js", "t_f3db78212cf98b7f1dd7"),
      hint:`${__dialogueText("config/ApartmentEscapeLeads.js", "t_56879be01b22ba019f83")}${country}${__dialogueText("config/ApartmentEscapeLeads.js", "t_1569a3df27449b5f1c6d")}`,
      useMessage:__dialogueText("config/ApartmentEscapeLeads.js", "t_858b7483d89747dba6aa")
    },
    {
      id:'escape_printed_message',label:__dialogueText("config/ApartmentEscapeLeads.js", "t_91e89befc1dc6a00008e"),
      description:__dialogueText("config/ApartmentEscapeLeads.js", "t_c7d16d57bf7da844a0e2"),
      hint:`${__dialogueText("config/ApartmentEscapeLeads.js", "t_9bde34c868cb8d540c15")}${country}${__dialogueText("config/ApartmentEscapeLeads.js", "t_fa1f5adfc1ca71b7e6db")}`,
      useMessage:__dialogueText("config/ApartmentEscapeLeads.js", "t_9079527ade388d2e4a56")
    },
    {
      id:'escape_guide_note',label:__dialogueText("config/ApartmentEscapeLeads.js", "t_b1798038bd97b037d210"),
      description:__dialogueText("config/ApartmentEscapeLeads.js", "t_c7092d17d4b6c1628e49"),
      hint:`${__dialogueText("config/ApartmentEscapeLeads.js", "t_0f8f48aa9bd296ca477a")}${country}${__dialogueText("config/ApartmentEscapeLeads.js", "t_3836af2d6a3cc38f792f")}`,
      useMessage:__dialogueText("config/ApartmentEscapeLeads.js", "t_39810c42fb092b408067")
    }
  ];
  const airportCode=getTicketAirportCode(target);
  if(airportCode) definitions.push({
    id:'plane_ticket_receipt',label:__dialogueText("config/ApartmentEscapeLeads.js", "t_c97596fcbe618510987a"),
    description:__dialogueText("config/ApartmentEscapeLeads.js", "t_742ec029e14dc4997c53"),
    ticket:true,useMessage:__dialogueText("config/ApartmentEscapeLeads.js", "t_c79728a3c377e9eefd8e")
  });
  const value=Number(random());
  const index=Math.floor(Math.max(0,Math.min(1-Number.EPSILON,Number.isFinite(value)?value:0))*definitions.length);
  const selected=definitions[index];
  return {
    id:selected.id,type:'document',label:selected.label,description:selected.description,quantity:1,
    isEscapeClue:true,isEscapeFragment:false,isArtifact:false,isClue:false,isRedHerring:false,
    metadata:{useMessage:selected.useMessage,ticketEvidence:selected.ticket===true,
      apartmentEscapeLead:{version:ESCAPE_LEAD_VERSION,targetCityId:target.id},
      ...(!selected.ticket?{escapeEvidence:{kind:'location_hint',hintsByCity:{[target.id]:selected.hint}}}:{})}
  };
}
