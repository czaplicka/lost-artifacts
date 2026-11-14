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
      id:'escape_booking_note',label:'Faded Hotel Booking',
      description:'A faded booking confirmation. The destination field cannot be read without examination.',
      hint:`The restored booking field reads: "Country: ${country}". The city name is still unreadable.`,
      useMessage:'A room reservation. Tempting, but this is not my holiday.'
    },
    {
      id:'escape_forwarding_slip',label:'Damaged Parcel Forwarding Slip',
      description:'A parcel forwarding slip with a damaged destination label.',
      hint:`The destination country on the forwarding label is ${country}. The rest of the address has been damaged.`,
      useMessage:'An address label. It needs examination, not a stamp from my personal collection.'
    },
    {
      id:'escape_printed_message',label:'Faded Printed Message',
      description:'A printed message about meeting abroad. An important line is faded.',
      hint:`The recovered line says: "I have arranged the meeting in ${country}." The town is not specified.`,
      useMessage:'The printer did half a job. Time to ask the lab for the other half.'
    },
    {
      id:'escape_guide_note',label:'Marked Travel Guide Page',
      description:'A travel guide page with a badly smudged handwritten destination note.',
      hint:`The handwriting can now be read: "Next stop: ${country}." No city name survives.`,
      useMessage:'Travel research with suspiciously poor handwriting.'
    }
  ];
  const airportCode=getTicketAirportCode(target);
  if(airportCode) definitions.push({
    id:'plane_ticket_receipt',label:'Damaged Travel Ticket',
    description:'A damaged travel ticket. The destination code needs laboratory examination.',
    ticket:true,useMessage:'A ticket, not a magic door. The lab may recover its destination code.'
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
