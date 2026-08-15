import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseCourtIds(value: string): string[] {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}

function stageLabel(size: number) {
  if (size > 8) return "round16";
  if (size > 4) return "quarterfinal";
  if (size > 2) return "semifinal";
  return "final";
}

async function tournamentPayload(db: D1Database, clubId: string, membershipId: string, canManage: boolean) {
  const tournaments = await db.prepare(`SELECT * FROM club_tournaments WHERE club_id=? AND (?=1 OR status!='cancelled') ORDER BY tournament_date, start_time`).bind(clubId, canManage ? 1 : 0).all<any>();
  const participants = await db.prepare(`SELECT p.tournament_id,p.membership_id,p.status,COALESCE(m.display_name_override,u.display_name) AS display_name FROM tournament_participants p JOIN club_tournaments t ON t.id=p.tournament_id AND t.club_id=? JOIN club_memberships m ON m.id=p.membership_id JOIN platform_users u ON u.id=m.user_id ORDER BY p.registered_at`).bind(clubId).all<any>();
  const groups = await db.prepare(`SELECT g.id,g.tournament_id,g.name,g.sort_order,e.membership_id,COALESCE(m.display_name_override,u.display_name) AS display_name FROM tournament_groups g JOIN club_tournaments t ON t.id=g.tournament_id AND t.club_id=? LEFT JOIN tournament_group_entries e ON e.group_id=g.id LEFT JOIN club_memberships m ON m.id=e.membership_id LEFT JOIN platform_users u ON u.id=m.user_id ORDER BY g.sort_order,e.seed_order`).bind(clubId).all<any>();
  const matches = await db.prepare(`SELECT matches.*,groups.name AS group_name,pa.display_name AS player_a,pb.display_name AS player_b,pw.display_name AS winner,courts.name AS court_name FROM tournament_matches matches JOIN club_tournaments t ON t.id=matches.tournament_id AND t.club_id=? LEFT JOIN tournament_groups groups ON groups.id=matches.group_id LEFT JOIN (SELECT m.id,COALESCE(m.display_name_override,u.display_name) AS display_name FROM club_memberships m JOIN platform_users u ON u.id=m.user_id) pa ON pa.id=matches.player_a_membership_id LEFT JOIN (SELECT m.id,COALESCE(m.display_name_override,u.display_name) AS display_name FROM club_memberships m JOIN platform_users u ON u.id=m.user_id) pb ON pb.id=matches.player_b_membership_id LEFT JOIN (SELECT m.id,COALESCE(m.display_name_override,u.display_name) AS display_name FROM club_memberships m JOIN platform_users u ON u.id=m.user_id) pw ON pw.id=matches.winner_membership_id LEFT JOIN club_courts courts ON courts.id=matches.court_id ORDER BY matches.match_order`).bind(clubId).all<any>();
  const teamRows = await db.prepare(`SELECT teams.id,teams.tournament_id,teams.name,teams.status,members.membership_id,COALESCE(m.display_name_override,u.display_name) AS display_name,members.position FROM tournament_teams teams JOIN club_tournaments t ON t.id=teams.tournament_id AND t.club_id=? LEFT JOIN tournament_team_members members ON members.team_id=teams.id LEFT JOIN club_memberships m ON m.id=members.membership_id LEFT JOIN platform_users u ON u.id=m.user_id ORDER BY teams.registered_at,members.position`).bind(clubId).all<any>();
  const groupTeamRows = await db.prepare(`SELECT gt.group_id,gt.team_id,gt.seed_order FROM tournament_group_teams gt JOIN tournament_groups g ON g.id=gt.group_id JOIN club_tournaments t ON t.id=g.tournament_id AND t.club_id=? ORDER BY gt.seed_order`).bind(clubId).all<any>();
  const teams = [...new Map((teamRows.results || []).map((row) => [row.id,{id:row.id,tournamentId:row.tournament_id,name:row.name,status:row.status,members:(teamRows.results || []).filter((member) => member.id===row.id&&member.membership_id).map((member) => ({membershipId:member.membership_id,displayName:member.display_name}))}])).values()] as any[];
  const groupRows = groups.results || [];
  return (tournaments.results || []).map((item) => ({
    id:item.id,title:item.title,type:item.tournament_type,date:item.tournament_date,start:item.start_time,deadline:item.registration_deadline,maxParticipants:Number(item.max_participants),entryFeeLabel:item.entry_fee_label,rules:item.rules,courtIds:parseCourtIds(item.court_ids_json),status:item.status,
    isRegistered:item.tournament_type==="double"?teams.some((team) => team.tournamentId===item.id&&team.status==="registered"&&team.members.some((member:any)=>member.membershipId===membershipId)):(participants.results || []).some((p) => p.tournament_id===item.id && p.membership_id===membershipId && p.status==="registered"),
    participants:(participants.results || []).filter((p) => p.tournament_id===item.id && p.status==="registered").map((p) => ({membershipId:p.membership_id,displayName:p.display_name})),
    teams:teams.filter((team) => team.tournamentId===item.id&&team.status==="registered"),
    groups:[...new Map(groupRows.filter((g) => g.tournament_id===item.id).map((g) => [g.id,{id:g.id,name:g.name,players:groupRows.filter((e) => e.id===g.id && e.membership_id).map((e) => ({membershipId:e.membership_id,displayName:e.display_name})),teams:(groupTeamRows.results||[]).filter((entry:any)=>entry.group_id===g.id).map((entry:any)=>teams.find((team)=>team.id===entry.team_id)).filter(Boolean)}])).values()],
    matches:(matches.results || []).filter((m) => m.tournament_id===item.id).map((m) => ({id:m.id,groupId:m.group_id,group:m.group_name,stage:m.stage,playerAMembershipId:m.player_a_membership_id,playerA:m.team_a_id?teams.find((team)=>team.id===m.team_a_id)?.name:m.player_a,playerBMembershipId:m.player_b_membership_id,playerB:m.team_b_id?teams.find((team)=>team.id===m.team_b_id)?.name:m.player_b,winnerMembershipId:m.winner_membership_id,winner:m.winner_team_id?teams.find((team)=>team.id===m.winner_team_id)?.name:m.winner,teamAId:m.team_a_id,teamBId:m.team_b_id,winnerTeamId:m.winner_team_id,score:m.score,courtId:m.court_id,court:m.court_name,start:m.start_time,status:m.status})),
  }));
}

async function requireTournament(db: D1Database, clubId: string, tournamentId: string) {
  const tournament = await db.prepare(`SELECT * FROM club_tournaments WHERE id=? AND club_id=?`).bind(tournamentId, clubId).first<any>();
  if (!tournament) throw new AppError(404,"tournament_not_found","Tournament does not exist.");
  return tournament;
}

export const tournamentRoutes = new Hono<AppEnv>();
tournamentRoutes.use("*", requireAuth);

tournamentRoutes.get("/:clubId/tournaments", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const member=await requireClubMembership(c.env.DB,auth.userId,clubId);
  return c.json({ok:true,tournaments:await tournamentPayload(c.env.DB,clubId,member.membershipId,["admin","manager"].includes(member.role))});
});

tournamentRoutes.post("/:clubId/tournaments", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const actor=await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const body=await readJsonObject(c);
  const title=String(body.title||"").trim().slice(0,140); const type=body.type==="double"?"double":"single"; const date=String(body.date||""); const start=String(body.start||""); const deadline=String(body.deadline||""); const max=Number(body.maxParticipants||16); const courtIds=Array.isArray(body.courtIds)?body.courtIds.filter((v):v is string=>typeof v==="string"):[];
  if(!title||!datePattern.test(date)||!timePattern.test(start)||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(deadline)||!Number.isInteger(max)||max<2||max>256||courtIds.length<1) throw new AppError(400,"invalid_tournament","Tournament needs valid dates, capacity and at least one court.");
  const validCourts=await c.env.DB.prepare(`SELECT id FROM club_courts WHERE club_id=? AND active=1`).bind(clubId).all<{id:string}>(); const allowed=new Set((validCourts.results||[]).map((court)=>court.id)); if(courtIds.some((id)=>!allowed.has(id))) throw new AppError(400,"invalid_court","Tournament court is not available in this club.");
  const id=crypto.randomUUID(); const now=new Date().toISOString(); const fee=String(body.entryFeeLabel||"Zdarma").trim().slice(0,80)||"Zdarma"; const rules=String(body.rules||"Skupiny kazdy s kazdym, potom pavouk.").trim().slice(0,3000);
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO club_tournaments (id,club_id,created_by_membership_id,title,tournament_type,tournament_date,start_time,registration_deadline,max_participants,entry_fee_label,rules,court_ids_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'registration',?,?)`).bind(id,clubId,actor.membershipId,title,type,date,start,deadline,max,fee,rules,JSON.stringify(courtIds),now,now),
    c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) SELECT lower(hex(randomblob(16))),?,id,?,'tournament_opened','Novy klubovy turnaj',?,'tournament',?,? FROM club_memberships WHERE club_id=? AND role='player' AND status='active'`).bind(clubId,actor.membershipId,`${title}, ${date} od ${start}. Prihlasky do ${deadline.replace("T"," ")}.`,id,now,clubId),
  ]);
  return c.json({ok:true,tournament:{id}},201);
});

tournamentRoutes.post("/:clubId/tournaments/:tournamentId/register", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const member=await requireClubMembership(c.env.DB,auth.userId,clubId,["player"]); const tournament=await requireTournament(c.env.DB,clubId,c.req.param("tournamentId"));
  if(tournament.status!=="registration"||tournament.registration_deadline<new Date().toISOString().slice(0,16)) throw new AppError(409,"registration_closed","Tournament registration is closed.");
  if(tournament.tournament_type==="double") {
    const body=await readJsonObject(c); const partnerId=typeof body.partnerMembershipId==="string"?body.partnerMembershipId:"";
    if(!partnerId||partnerId===member.membershipId) throw new AppError(400,"partner_required","A doubles team needs one partner.");
    const partner=await c.env.DB.prepare(`SELECT id FROM club_memberships WHERE id=? AND club_id=? AND role='player' AND status='active'`).bind(partnerId,clubId).first();
    if(!partner) throw new AppError(400,"invalid_partner","The partner is not an active player in this club.");
    const existing=await c.env.DB.prepare(`SELECT tm.membership_id FROM tournament_team_members tm JOIN tournament_teams tt ON tt.id=tm.team_id WHERE tt.tournament_id=? AND tt.status='registered' AND tm.membership_id IN (?,?) LIMIT 1`).bind(tournament.id,member.membershipId,partnerId).first();
    if(existing) throw new AppError(409,"already_registered","One of the players is already registered in a pair.");
    const count=await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM tournament_team_members tm JOIN tournament_teams tt ON tt.id=tm.team_id WHERE tt.tournament_id=? AND tt.status='registered'`).bind(tournament.id).first<{count:number}>();
    if(Number(count?.count||0)+2>Number(tournament.max_participants)) throw new AppError(409,"tournament_full","Tournament is full.");
    const names=await c.env.DB.prepare(`SELECT m.id,COALESCE(m.display_name_override,u.display_name) AS name FROM club_memberships m JOIN platform_users u ON u.id=m.user_id WHERE m.id IN (?,?)`).bind(member.membershipId,partnerId).all<any>();
    const teamId=crypto.randomUUID(); const now=new Date().toISOString(); const teamName=(names.results||[]).map((row)=>row.name).join(" / ");
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO tournament_teams (id,tournament_id,name,status,registered_at,updated_at) VALUES (?,?,?,'registered',?,?)`).bind(teamId,tournament.id,teamName,now,now),
      c.env.DB.prepare(`INSERT INTO tournament_team_members (team_id,membership_id,position) VALUES (?,?,1),(?,?,2)`).bind(teamId,member.membershipId,teamId,partnerId),
      c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) VALUES (?,?,?,?, 'tournament_pair_registered','Prihlasen do ctyrhry',?,'tournament',?,?)`).bind(crypto.randomUUID(),clubId,partnerId,member.membershipId,`${teamName}: ${tournament.title}`,tournament.id,now),
    ]);
    return c.json({ok:true,team:{id:teamId,name:teamName}});
  }
  const count=await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM tournament_participants WHERE tournament_id=? AND status='registered'`).bind(tournament.id).first<{count:number}>(); if(Number(count?.count||0)>=Number(tournament.max_participants)) throw new AppError(409,"tournament_full","Tournament is full.");
  const now=new Date().toISOString(); await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO tournament_participants (tournament_id,membership_id,status,registered_at,updated_at) VALUES (?,?,'registered',?,?) ON CONFLICT(tournament_id,membership_id) DO UPDATE SET status='registered',updated_at=excluded.updated_at`).bind(tournament.id,member.membershipId,now,now),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at=?,read_at=COALESCE(read_at,?) WHERE recipient_membership_id=? AND entity_type='tournament' AND entity_id=? AND acted_at IS NULL`).bind(now,now,member.membershipId,tournament.id),
  ]); return c.json({ok:true});
});

tournamentRoutes.delete("/:clubId/tournaments/:tournamentId/register", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const member=await requireClubMembership(c.env.DB,auth.userId,clubId,["player"]); const tournament=await requireTournament(c.env.DB,clubId,c.req.param("tournamentId")); if(tournament.status!=="registration") throw new AppError(409,"registration_closed","Tournament registration is closed.");
  if(tournament.tournament_type==="double") { await c.env.DB.prepare(`UPDATE tournament_teams SET status='withdrawn',updated_at=? WHERE tournament_id=? AND id IN (SELECT team_id FROM tournament_team_members WHERE membership_id=?)`).bind(new Date().toISOString(),tournament.id,member.membershipId).run(); return c.json({ok:true}); }
  await c.env.DB.prepare(`UPDATE tournament_participants SET status='withdrawn',updated_at=? WHERE tournament_id=? AND membership_id=?`).bind(new Date().toISOString(),tournament.id,member.membershipId).run(); return c.json({ok:true});
});

tournamentRoutes.post("/:clubId/tournaments/:tournamentId/draw", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const tournament=await requireTournament(c.env.DB,clubId,c.req.param("tournamentId")); if(tournament.status!=="registration") throw new AppError(409,"already_drawn","Tournament has already been drawn.");
  if(tournament.tournament_type==="double") {
    const teamResult=await c.env.DB.prepare(`SELECT id FROM tournament_teams WHERE tournament_id=? AND status='registered' ORDER BY registered_at`).bind(tournament.id).all<{id:string}>(); const teamIds=(teamResult.results||[]).map((team)=>team.id);
    if(teamIds.length<2) throw new AppError(409,"not_enough_teams","At least two pairs are required.");
    const courts=parseCourtIds(tournament.court_ids_json); const groupCount=Math.max(1,Math.min(courts.length,Math.ceil(teamIds.length/4))); const groups=Array.from({length:groupCount},(_,i)=>({id:crypto.randomUUID(),name:String.fromCharCode(65+i),teams:[] as string[]})); teamIds.forEach((teamId,index)=>groups[index%groupCount]!.teams.push(teamId)); const now=new Date().toISOString(); const statements:D1PreparedStatement[]=[c.env.DB.prepare(`UPDATE club_tournaments SET status='groups',updated_at=? WHERE id=?`).bind(now,tournament.id)]; let order=0;
    groups.forEach((group,index)=>{ statements.push(c.env.DB.prepare(`INSERT INTO tournament_groups (id,tournament_id,name,sort_order) VALUES (?,?,?,?)`).bind(group.id,tournament.id,group.name,index)); group.teams.forEach((id,seed)=>statements.push(c.env.DB.prepare(`INSERT INTO tournament_group_teams (group_id,team_id,seed_order) VALUES (?,?,?)`).bind(group.id,id,seed))); for(let a=0;a<group.teams.length;a++) for(let b=a+1;b<group.teams.length;b++){ const minute=((Number(tournament.start_time.slice(0,2))*60+Number(tournament.start_time.slice(3)))+order*60); const time=`${String(Math.floor(minute/60)%24).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`; statements.push(c.env.DB.prepare(`INSERT INTO tournament_matches (id,tournament_id,group_id,stage,match_order,team_a_id,team_b_id,court_id,start_time,status,created_at,updated_at) VALUES (?,?,?,'group',?,?,?,?,?,'scheduled',?,?)`).bind(crypto.randomUUID(),tournament.id,group.id,order,group.teams[a],group.teams[b],courts[order%courts.length]||null,time,now,now)); order++; }}); await c.env.DB.batch(statements); return c.json({ok:true,groups:groups.length,matches:order});
  }
  const people=await c.env.DB.prepare(`SELECT membership_id FROM tournament_participants WHERE tournament_id=? AND status='registered' ORDER BY registered_at`).bind(tournament.id).all<{membership_id:string}>(); const players=people.results||[]; if(players.length<2) throw new AppError(409,"not_enough_players","At least two players are required.");
  const courts=parseCourtIds(tournament.court_ids_json); const groupCount=Math.max(1,Math.min(courts.length,Math.ceil(players.length/4))); const groups=Array.from({length:groupCount},(_,i)=>({id:crypto.randomUUID(),name:String.fromCharCode(65+i),players:[] as string[]})); players.forEach((player,index)=>groups[index%groupCount]!.players.push(player.membership_id)); const now=new Date().toISOString(); const statements:D1PreparedStatement[]=[c.env.DB.prepare(`UPDATE club_tournaments SET status='groups',updated_at=? WHERE id=?`).bind(now,tournament.id)]; let order=0;
  groups.forEach((group,index)=>{ statements.push(c.env.DB.prepare(`INSERT INTO tournament_groups (id,tournament_id,name,sort_order) VALUES (?,?,?,?)`).bind(group.id,tournament.id,group.name,index)); group.players.forEach((id,seed)=>statements.push(c.env.DB.prepare(`INSERT INTO tournament_group_entries (group_id,membership_id,seed_order) VALUES (?,?,?)`).bind(group.id,id,seed))); for(let a=0;a<group.players.length;a++) for(let b=a+1;b<group.players.length;b++){ const minute=((Number(tournament.start_time.slice(0,2))*60+Number(tournament.start_time.slice(3)))+order*45); const time=`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`; statements.push(c.env.DB.prepare(`INSERT INTO tournament_matches (id,tournament_id,group_id,stage,match_order,player_a_membership_id,player_b_membership_id,court_id,start_time,status,created_at,updated_at) VALUES (?,?,?,'group',?,?,?,?,?,'scheduled',?,?)`).bind(crypto.randomUUID(),tournament.id,group.id,order,group.players[a],group.players[b],courts[order%courts.length]||null,time,now,now)); order++; }}); await c.env.DB.batch(statements); return c.json({ok:true,groups:groups.length,matches:order});
});

tournamentRoutes.put("/:clubId/tournaments/:tournamentId/matches/:matchId", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); await requireTournament(c.env.DB,clubId,c.req.param("tournamentId")); const body=await readJsonObject(c); const score=String(body.score||"").trim().slice(0,40); const winner=String(body.winnerMembershipId||"");
  const winnerTeam=String(body.winnerTeamId||""); const match=await c.env.DB.prepare(`SELECT player_a_membership_id,player_b_membership_id,team_a_id,team_b_id FROM tournament_matches WHERE id=? AND tournament_id=?`).bind(c.req.param("matchId"),c.req.param("tournamentId")).first<any>();
  const validTeam=winnerTeam&&[match?.team_a_id,match?.team_b_id].includes(winnerTeam); const validPlayer=winner&&[match?.player_a_membership_id,match?.player_b_membership_id].includes(winner);
  if(!match||(!validTeam&&!validPlayer)||!score) throw new AppError(400,"invalid_result","Result needs a score and one of the match sides as winner.");
  await c.env.DB.prepare(`UPDATE tournament_matches SET score=?,winner_membership_id=?,winner_team_id=?,status='completed',updated_at=? WHERE id=?`).bind(score,validPlayer?winner:null,validTeam?winnerTeam:null,new Date().toISOString(),c.req.param("matchId")).run(); return c.json({ok:true});
});

tournamentRoutes.post("/:clubId/tournaments/:tournamentId/knockout", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const tournament=await requireTournament(c.env.DB,clubId,c.req.param("tournamentId")); if(tournament.status!=="groups") throw new AppError(409,"groups_required","Group stage is required first.");
  if(tournament.tournament_type==="double") {
    const groups=await c.env.DB.prepare(`SELECT id FROM tournament_groups WHERE tournament_id=? ORDER BY sort_order`).bind(tournament.id).all<{id:string}>(); const qualified:string[]=[]; for(const group of groups.results||[]){const standings=await c.env.DB.prepare(`SELECT e.team_id,COALESCE(SUM(CASE WHEN m.winner_team_id=e.team_id THEN 1 ELSE 0 END),0) AS wins FROM tournament_group_teams e LEFT JOIN tournament_matches m ON m.group_id=e.group_id AND m.status='completed' WHERE e.group_id=? GROUP BY e.team_id ORDER BY wins DESC,e.seed_order LIMIT 2`).bind(group.id).all<{team_id:string}>(); qualified.push(...(standings.results||[]).map((row)=>row.team_id));}
    if(qualified.length<2) throw new AppError(409,"not_enough_qualified","Not enough pairs for knockout."); const now=new Date().toISOString(); const stage=stageLabel(qualified.length); const courts=parseCourtIds(tournament.court_ids_json); const statements:D1PreparedStatement[]=[c.env.DB.prepare(`UPDATE club_tournaments SET status='knockout',updated_at=? WHERE id=?`).bind(now,tournament.id)]; let matchCount=0; for(let i=0;i<qualified.length;i+=2){if(!qualified[i+1])break;statements.push(c.env.DB.prepare(`INSERT INTO tournament_matches (id,tournament_id,stage,match_order,team_a_id,team_b_id,court_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'scheduled',?,?)`).bind(crypto.randomUUID(),tournament.id,stage,100+i/2,qualified[i],qualified[i+1],courts[matchCount%courts.length]||null,now,now));matchCount++;} await c.env.DB.batch(statements); return c.json({ok:true,matches:matchCount});
  }
  const groups=await c.env.DB.prepare(`SELECT id FROM tournament_groups WHERE tournament_id=? ORDER BY sort_order`).bind(tournament.id).all<{id:string}>(); const qualified:string[]=[]; for(const group of groups.results||[]){ const standings=await c.env.DB.prepare(`SELECT e.membership_id,COALESCE(SUM(CASE WHEN m.winner_membership_id=e.membership_id THEN 1 ELSE 0 END),0) AS wins FROM tournament_group_entries e LEFT JOIN tournament_matches m ON m.group_id=e.group_id AND m.status='completed' WHERE e.group_id=? GROUP BY e.membership_id ORDER BY wins DESC,e.seed_order LIMIT 2`).bind(group.id).all<{membership_id:string}>(); qualified.push(...(standings.results||[]).map((row)=>row.membership_id)); }
  if(qualified.length<2) throw new AppError(409,"not_enough_qualified","Not enough players for knockout."); const now=new Date().toISOString(); const stage=stageLabel(qualified.length); const courts=parseCourtIds(tournament.court_ids_json); const statements:D1PreparedStatement[]=[c.env.DB.prepare(`UPDATE club_tournaments SET status='knockout',updated_at=? WHERE id=?`).bind(now,tournament.id)]; let matches=0; for(let i=0;i<qualified.length;i+=2){if(!qualified[i+1]) break; statements.push(c.env.DB.prepare(`INSERT INTO tournament_matches (id,tournament_id,stage,match_order,player_a_membership_id,player_b_membership_id,court_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'scheduled',?,?)`).bind(crypto.randomUUID(),tournament.id,stage,100+i/2,qualified[i],qualified[i+1],courts[matches%courts.length]||null,now,now)); matches++;} await c.env.DB.batch(statements); return c.json({ok:true,matches});
});

tournamentRoutes.post("/:clubId/tournaments/:tournamentId/archive", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]); const result=await c.env.DB.prepare(`UPDATE club_tournaments SET status='completed',updated_at=? WHERE id=? AND club_id=? AND status!='cancelled'`).bind(new Date().toISOString(),c.req.param("tournamentId"),clubId).run(); if(!result.meta.changes) throw new AppError(404,"tournament_not_found","Tournament does not exist."); return c.json({ok:true});
});
