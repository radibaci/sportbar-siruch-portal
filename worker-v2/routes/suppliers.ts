import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";
import { validateBookingTime } from "../reservations/time";

async function requestPayload(db: D1Database, clubId: string) {
  const rows = await db.prepare(`SELECT requests.*,events.title,events.detail,events.event_date,events.start_time,events.end_time,events.fee_label,events.image_url,events.status AS event_status,options.label AS winning_option FROM supplier_event_requests requests JOIN club_events events ON events.id=requests.event_id LEFT JOIN club_poll_options options ON options.id=requests.winner_option_id WHERE requests.club_id=? ORDER BY requests.created_at DESC`).bind(clubId).all<any>();
  return (rows.results || []).map((item) => ({
    id:item.id,eventId:item.event_id,pollId:item.poll_id,title:item.title,detail:item.detail,date:item.event_date,start:item.start_time,end:item.end_time,feeLabel:item.fee_label,imageUrl:item.image_url,eventStatus:item.event_status,winningOption:item.winning_option,requestedItems:item.requested_items,status:item.status,sellerItems:item.seller_items,sellerNote:item.seller_note,
  }));
}

export const supplierRoutes = new Hono<AppEnv>();
supplierRoutes.use("*", requireAuth);

supplierRoutes.get("/:clubId/supplier-requests", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager","seller"]);
  return c.json({ok:true,requests:await requestPayload(c.env.DB,clubId)});
});

supplierRoutes.post("/:clubId/polls/:pollId/supplier-request", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const actor=await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const body=await readJsonObject(c); const time=validateBookingTime(body.date,body.start,body.end);
  const poll=await c.env.DB.prepare(`SELECT id,title,status FROM club_polls WHERE id=? AND club_id=?`).bind(c.req.param("pollId"),clubId).first<any>(); if(!poll||poll.status!=="closed") throw new AppError(409,"poll_must_be_closed","Close the poll before requesting a supplier.");
  const winner=await c.env.DB.prepare(`SELECT options.id,options.label,options.logistics_note,COALESCE(SUM(votes.weight),0) AS weighted FROM club_poll_options options LEFT JOIN club_poll_votes votes ON votes.option_id=options.id WHERE options.poll_id=? GROUP BY options.id ORDER BY weighted DESC,options.sort_order LIMIT 1`).bind(poll.id).first<any>(); if(!winner) throw new AppError(409,"poll_has_no_options","Poll has no result.");
  const existing=await c.env.DB.prepare(`SELECT id FROM supplier_event_requests WHERE poll_id=? AND club_id=?`).bind(poll.id,clubId).first(); if(existing) throw new AppError(409,"supplier_request_exists","This poll already has a supplier request.");
  const eventId=crypto.randomUUID(); const requestId=crypto.randomUUID(); const now=new Date().toISOString(); const title=String(body.title||`Testovani: ${winner.label.replace(/^[A-D]\s*-\s*/i,"")}`).trim().slice(0,140); const requestedItems=String(body.requestedItems||winner.logistics_note||winner.label).trim().slice(0,3000);
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO club_events (id,club_id,created_by_user_id,event_type,title,detail,event_date,start_time,end_time,fee_label,capacity,status,created_at,updated_at) VALUES (?,?,?,'demo',?,?,?,?,?,'Zdarma',NULL,'draft',?,?)`).bind(eventId,clubId,auth.userId,title,`Navrh z ankety: ${poll.title}. Vitez: ${winner.label}.`,time.date,time.start,time.end,now,now),
    c.env.DB.prepare(`INSERT INTO supplier_event_requests (id,club_id,event_id,poll_id,winner_option_id,created_by_membership_id,requested_items,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)`).bind(requestId,clubId,eventId,poll.id,winner.id,actor.membershipId,requestedItems,now,now),
    c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) SELECT lower(hex(randomblob(16))),?,id,?,'supplier_request','Nova poptavka testovaci akce',?,'supplier_request',?,? FROM club_memberships WHERE club_id=? AND role='seller' AND status='active'`).bind(clubId,actor.membershipId,`${title}, ${time.date} ${time.start}-${time.end}. Pozadovano: ${requestedItems}`,requestId,now,clubId),
  ]); return c.json({ok:true,request:{id:requestId,eventId}},201);
});

supplierRoutes.put("/:clubId/supplier-requests/:requestId/respond", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const seller=await requireClubMembership(c.env.DB,auth.userId,clubId,["seller"]); const body=await readJsonObject(c); const response=body.response==="decline"?"declined":"confirmed"; const items=String(body.items||"").trim().slice(0,3000); const note=String(body.note||"").trim().slice(0,3000); if(response==="confirmed"&&!items) throw new AppError(400,"items_required","Confirmed request needs a delivery list.");
  const request=await c.env.DB.prepare(`SELECT requests.id,requests.event_id,requests.created_by_membership_id,events.event_date,events.start_time,events.end_time FROM supplier_event_requests requests JOIN club_events events ON events.id=requests.event_id WHERE requests.id=? AND requests.club_id=? AND requests.status='pending'`).bind(c.req.param("requestId"),clubId).first<any>(); if(!request) throw new AppError(404,"supplier_request_not_found","Pending supplier request does not exist."); const eventTime=validateBookingTime(body.date||request.event_date,body.start||request.start_time,body.end||request.end_time); const now=new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE supplier_event_requests SET status=?,seller_membership_id=?,seller_items=?,seller_note=?,responded_at=?,updated_at=? WHERE id=?`).bind(response,seller.membershipId,items,note,now,now,request.id),
    c.env.DB.prepare(`UPDATE club_events SET event_date=?,start_time=?,end_time=?,updated_at=? WHERE id=?`).bind(eventTime.date,eventTime.start,eventTime.end,now,request.event_id),
    c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),clubId,request.created_by_membership_id,seller.membershipId,response==="confirmed"?"supplier_confirmed":"supplier_declined",response==="confirmed"?"Obchodnik potvrdil akci":"Obchodnik akci odmitl",response==="confirmed"?`Dodame: ${items}. ${note}`:note,"supplier_request",request.id,now),
  ]); return c.json({ok:true,status:response});
});

supplierRoutes.post("/:clubId/supplier-requests/:requestId/publish", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const actor=await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const request=await c.env.DB.prepare(`SELECT requests.id,requests.event_id,events.title,events.event_date,events.start_time,events.end_time FROM supplier_event_requests requests JOIN club_events events ON events.id=requests.event_id WHERE requests.id=? AND requests.club_id=? AND requests.status='confirmed' AND events.status='draft'`).bind(c.req.param("requestId"),clubId).first<any>(); if(!request) throw new AppError(409,"supplier_confirmation_required","Supplier confirmation is required before publication."); const now=new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE club_events SET status='published',updated_at=? WHERE id=?`).bind(now,request.event_id),
    c.env.DB.prepare(`UPDATE supplier_event_requests SET status='published',updated_at=? WHERE id=?`).bind(now,request.id),
    c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) SELECT lower(hex(randomblob(16))),?,id,?,'event_announcement','Nova klubova akce',?,'event',?,? FROM club_memberships WHERE club_id=? AND role='player' AND status='active'`).bind(clubId,actor.membershipId,`${request.event_date} ${request.start_time}-${request.end_time}, ${request.title}`,request.event_id,now,clubId),
  ]); return c.json({ok:true,eventId:request.event_id});
});
