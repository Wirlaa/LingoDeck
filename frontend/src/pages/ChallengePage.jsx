import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getChallengeState, startChallenge, submitChallengeAction,
  preTurn as callPreTurn, getScenarioUnlocks,
} from "../api/challengeService";
import { getMyCollection, getCollectionByScenario } from "../api/cardService";

const CHAPTERS = [
  { scenario:"cafe_order",        number:"I",   title:"The Cafe",      subtitle:"Language of warmth",  description:"Orders, politeness, food vocabulary.", color:"#f59e0b", dark:"#92400e", glow:"#fbbf24", alwaysUnlocked:true },
  { scenario:"asking_directions", number:"II",  title:"The City",      subtitle:"Find your way",       description:"Navigate streets and landmarks.",     color:"#34d399", dark:"#065f46", glow:"#6ee7b7" },
  { scenario:"job_interview",     number:"III", title:"The Interview", subtitle:"Prove yourself",      description:"Formal Finnish, impress the panel.",  color:"#60a5fa", dark:"#1e3a8a", glow:"#93c5fd" },
  { scenario:"kela_boss",         number:"IV",  title:"KELA",          subtitle:"The final boss",      description:"Ultimate bureaucracy showdown.",      color:"#c084fc", dark:"#4c1d95", glow:"#ddd6fe" },
];

const RARITY = {
  Common:    { border:"#9ca3af", glow:"rgba(156,163,175,0.4)", badge:"#78716c", bg:"rgba(8,6,4,0.93)"  },
  Uncommon:  { border:"#4ade80", glow:"rgba(74,222,128,0.5)",  badge:"#16a34a", bg:"rgba(2,12,4,0.95)"  },
  Rare:      { border:"#60a5fa", glow:"rgba(96,165,250,0.55)", badge:"#1d4ed8", bg:"rgba(2,6,20,0.95)"  },
  Epic:      { border:"#c084fc", glow:"rgba(192,132,252,0.55)",badge:"#7c3aed", bg:"rgba(10,2,20,0.95)" },
  Legendary: { border:"#fbbf24", glow:"rgba(251,191,36,0.65)", badge:"#b45309", bg:"rgba(20,12,2,0.97)" },
};

const RARITY_LIGHT = {
  Common:    { border:"#d1d5db", badge:"#78716c", bg:"rgba(255,255,255,0.93)", star:"#9ca3af" },
  Uncommon:  { border:"#86efac", badge:"#16a34a", bg:"rgba(240,253,244,0.95)", star:"#16a34a" },
  Rare:      { border:"#93c5fd", badge:"#1d4ed8", bg:"rgba(239,246,255,0.95)", star:"#2563eb" },
  Epic:      { border:"#d8b4fe", badge:"#7c3aed", bg:"rgba(250,245,255,0.95)", star:"#7c3aed" },
  Legendary: { border:"#fcd34d", badge:"#b45309", bg:"rgba(255,251,235,0.97)", star:"#d97706" },
};

const DECK_SIZE = 5;

function er(e, fb) { return e?.response?.data?.message || e?.response?.data?.detail || e?.message || fb; }
function ck(c) { return `${c?.card_id||""}`; }

function deriveRewards(before, after) {
  const map = new Map(before.map(c=>[ck(c),c]));
  return after.map(c=>{
    const p=map.get(ck(c));
    if(!p) return{...c,is_new:true,xp_gained:0};
    const changed=Number(c?.star_level||0)!==Number(p?.star_level||0)||Number(c?.xp||0)!==Number(p?.xp||0);
    if(!changed) return null;
    return{...c,is_new:false,xp_gained:Math.max(0,Number(c?.xp||0)-Number(p?.xp||0))};
  }).filter(Boolean).sort((a,b)=>Number(b?.is_new)-Number(a?.is_new)).slice(0,5);
}
async function pollRewards(before,attempts=15,ms=500){
  let best=[];
  for(let i=0;i<attempts;i++){
    if(i>0)await new Promise(r=>setTimeout(r,ms));
    try{const col=await getMyCollection();const after=Array.isArray(col?.cards)?col.cards:[];const ch=deriveRewards(before,after);if(ch.length>best.length)best=ch;if(best.length>=3)break;}catch{}
  }
  return best;
}

// always-reset press handler
const press=()=>({
  onMouseDown:(e)=>{e.currentTarget.style.transform="translateY(4px)";e.currentTarget.style.boxShadow="none";},
  onMouseUp:  (e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";},
  onMouseLeave:(e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";},
});

const CSS=`
@keyframes chGlow{0%,100%{box-shadow:0 0 18px var(--g),0 8px 32px rgba(0,0,0,0.5)}50%{box-shadow:0 0 36px var(--g),0 8px 32px rgba(0,0,0,0.5)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes cardIn{from{opacity:0;transform:translateY(24px) scale(0.88)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes panelIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.ch-card{animation:chGlow 2.5s ease-in-out infinite;}
.ci{animation:cardIn 0.38s ease both;}
.meter{transition:width 0.55s cubic-bezier(0.4,0,0.2,1);}
`;

// ── Help modal ────────────────────────────────────────────────────────────────
function HelpModal({onClose,chapter}){
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div style={{background:"linear-gradient(160deg,#fff4df,#fde8c0)",border:`4px solid ${chapter?.color||"#8b5a2b"}`,borderRadius:"20px",boxShadow:`0 0 40px ${chapter?.glow||"rgba(139,90,43,0.4)"}`,width:"min(520px,92vw)",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"sticky",top:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",background:chapter?.color||"#8b5a2b",color:"#fff"}}>
          <span style={{fontWeight:900,fontSize:"16px"}}>◆ How to Battle</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"white",fontSize:"20px",fontWeight:900,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {[["◈","The Goal","Push the Battle Meter to +100 to win. Drop to -100 and you lose. 10 turns."],["◆","Each Turn","Finnish fill-in-the-blank. Pick the correct answer AND play a card from the hand below. Hit Submit."],["○","Any Order","Pick answer and card in ANY order — just both before submitting."],["★","Star Levels","1★: +10 / -22  ·  2★: +18 / -16  ·  3★: +28 / -10 (combo at 2)  ·  4★: +40 / -6 + removes one wrong answer"],["◆","4★ Ability","Select a 4★ card to eliminate one wrong answer option automatically."],["✦","Combos","3★+: 2 correct → ×1.5  ·  Any: 5 correct → ×2.0  ·  Wrong resets streak."]].map(([icon,title,text])=>(
            <div key={title} style={{display:"flex",gap:"12px"}}>
              <span style={{fontSize:"18px",flexShrink:0,marginTop:"2px",fontWeight:900,color:chapter?.color||"#8b5a2b"}}>{icon}</span>
              <div>
                <p style={{fontWeight:900,fontSize:"13px",color:chapter?.color||"#8b5a2b",marginBottom:"2px"}}>{title}</p>
                <p style={{fontSize:"13px",color:"#5a3b1a",lineHeight:1.5}}>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:"0 20px 16px",textAlign:"center"}}>
          <button onClick={onClose} style={{padding:"10px 32px",borderRadius:"12px",background:chapter?.color||"#8b5a2b",color:"#fff",fontWeight:900,fontSize:"13px",textTransform:"uppercase",letterSpacing:"0.1em",cursor:"pointer",border:"none"}} {...press()}>Let's Fight!</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════ STORY MAP ═══════════════════════════════════════════════════
function StoryMap({unlocked,onSelect,navigate}){
  return(
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-8" style={{background:"linear-gradient(to bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.7))"}}>
      <style>{CSS}</style>
      <div className="text-center mb-8" style={{animation:"fadeUp 0.5s ease both"}}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-2" style={{color:"rgba(255,244,223,0.55)",textShadow:"1px 2px 0 rgba(0,0,0,0.9)"}}>your journey</p>
        <h1 className="font-black uppercase leading-none" style={{fontSize:"clamp(2.5rem,8vw,5.5rem)",color:"#fff4df",textShadow:"2px 3px 0 rgba(0,0,0,0.85)"}}>Chapter Select</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        {CHAPTERS.map((ch,idx)=>{
          const ok=ch.alwaysUnlocked||unlocked.includes(ch.scenario);
          return(
            <button key={ch.scenario} onClick={()=>ok&&onSelect(ch)} disabled={!ok}
              className={`relative flex flex-col text-left rounded-2xl overflow-hidden transition-all duration-300 ${ok?"cursor-pointer ch-card hover:scale-105":"cursor-not-allowed"}`}
              style={{minHeight:"clamp(200px,28vw,280px)",background:ok?`linear-gradient(160deg,${ch.dark}ee,${ch.dark}99)`:"rgba(8,4,2,0.75)",border:`2px solid ${ok?ch.color:"rgba(255,255,255,0.07)"}`,filter:ok?"none":"grayscale(0.5) brightness(0.65)","--g":ch.glow}}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{fontSize:"clamp(80px,14vw,130px)",fontWeight:900,color:`${ch.color}18`,userSelect:"none"}}>{ch.number}</div>
              {!ok&&<div className="absolute inset-0 flex flex-col items-center justify-center" style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(3px)"}}>
                <span style={{fontSize:"32px",color:"rgba(255,255,255,0.18)",fontWeight:900}}>◈</span>
                <p className="text-xs font-black uppercase tracking-[0.2em] mt-2" style={{color:"rgba(255,255,255,0.25)"}}>Locked</p>
                <p className="text-[10px] mt-1" style={{color:"rgba(255,255,255,0.18)"}}>Beat chapter {CHAPTERS[idx-1]?.number}</p>
              </div>}
              <div className="relative z-10 flex flex-col justify-end flex-1 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{color:ok?ch.color:"rgba(255,255,255,0.25)"}}>Chapter {ch.number}</p>
                <h2 className="font-black leading-tight" style={{fontSize:"clamp(1.2rem,3vw,1.6rem)",color:ok?"#fff4df":"rgba(255,255,255,0.35)"}}>{ch.title}</h2>
                <p className="text-xs italic mt-0.5 mb-3" style={{color:ok?"rgba(255,244,223,0.55)":"rgba(255,255,255,0.2)"}}>{ch.subtitle}</p>
                <p className="text-xs" style={{color:ok?"rgba(255,244,223,0.5)":"rgba(255,255,255,0.18)"}}>{ch.description}</p>
                {ok&&<div className="mt-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-center" style={{background:`${ch.color}25`,border:`1px solid ${ch.color}55`,color:ch.color}}>FIGHT ›</div>}
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={()=>navigate("/")} className="mt-8 text-xs font-semibold uppercase tracking-widest cursor-pointer" style={{color:"rgba(255,244,223,0.35)",textShadow:"1px 2px 0 rgba(0,0,0,0.9)"}}>← Back Home</button>
    </div>
  );
}

// ═══════════════ DECK BUILDER ════════════════════════════════════════════════
function DeckBuilder({chapter,cards,selectedDeck,onToggle,onFight,onBack,starting,onHelp}){
  const canFight=selectedDeck.length===DECK_SIZE;
  const eligible=cards.filter(c=>c.star_level>=2);
  return(
    <div className="min-h-screen pt-20 pb-8 px-4" style={{background:"linear-gradient(to bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.82))"}}>
      <style>{CSS}</style>
      <div className="max-w-4xl mx-auto mb-5" style={{animation:"fadeUp 0.4s ease both"}}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-xs cursor-pointer" style={{color:"rgba(255,244,223,0.45)",textShadow:"1px 1px 4px rgba(0,0,0,0.9)"}}>← Back</button>
          <button onClick={onHelp} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black cursor-pointer hover:scale-110 transition-all" style={{background:chapter.color,color:"#fff"}}>?</button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{color:chapter.color,textShadow:"1px 1px 4px rgba(0,0,0,0.9)"}}>Chapter {chapter.number} — {chapter.title}</p>
            <h2 className="font-black" style={{fontSize:"clamp(1.6rem,5vw,2.5rem)",color:"#fff4df",textShadow:"2px 3px 0 rgba(0,0,0,0.85)"}}>Build Your Deck</h2>
            <p className="text-sm mt-1" style={{color:"rgba(255,244,223,0.55)",textShadow:"1px 1px 4px rgba(0,0,0,0.9)"}}>Pick exactly {DECK_SIZE} cards. Higher ★ = bigger meter swings.</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-black" style={{fontSize:"clamp(2rem,5vw,3rem)",color:canFight?chapter.color:"rgba(255,255,255,0.3)"}}>{selectedDeck.length}<span style={{fontSize:"1rem",color:"rgba(255,255,255,0.25)"}}>/{DECK_SIZE}</span></p>
          </div>
        </div>
      </div>
      {eligible.length<DECK_SIZE&&(
        <div className="max-w-4xl mx-auto mb-5 rounded-xl p-3" style={{background:"rgba(185,28,28,0.25)",border:"1px solid rgba(185,28,28,0.5)"}}>
          <p className="text-sm font-semibold" style={{color:"#fca5a5",textShadow:"1px 1px 4px rgba(0,0,0,0.9)"}}>Only {eligible.length} eligible cards (need {DECK_SIZE} at 2★+).</p>
        </div>
      )}
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {cards.map((card,i)=>{
          const r=RARITY_LIGHT[card.rarity]||RARITY_LIGHT.Common;
          const isSel=selectedDeck.includes(card.card_id);
          const isEl=card.star_level>=2;
          const locked=!isEl||(!isSel&&selectedDeck.length>=DECK_SIZE);
          const stars=Array.from({length:4},(_,j)=>j<card.star_level?"★":"☆").join("");
          return(
            <button key={card.card_id} onClick={()=>!locked&&onToggle(card.card_id)}
              className="ci relative text-left rounded-xl p-3 transition-all duration-200"
              style={{animationDelay:`${i*0.04}s`,cursor:locked?"not-allowed":"pointer",background:isSel?`linear-gradient(160deg,${r.bg},white)`:r.bg,border:`2px solid ${isSel?r.border:isEl?"rgba(0,0,0,0.1)":"rgba(255,255,255,0.2)"}`,boxShadow:isSel?"0 0 16px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.15)":"0 2px 6px rgba(0,0,0,0.15)",transform:isSel?"scale(1.04) translateY(-2px)":"scale(1)",opacity:!isEl?0.4:(locked&&!isSel)?0.6:1,minHeight:"110px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}
            >
              {isSel&&<div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{background:r.badge}}>✓</div>}
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full text-white self-start" style={{background:r.badge}}>{card.rarity}</span>
              <div>
                <p className="font-black text-sm leading-tight mt-1.5 text-[#1a1a1a]">{card.word_fi}</p>
                <p className="text-[10px] italic mt-0.5 text-[#666]">{card.word_en}</p>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span style={{fontSize:"11px",fontWeight:700,color:r.star}}>{stars}</span>
                {card.star_level>=4&&<span className="text-[8px] font-black" style={{color:"#d97706"}}>◆ ACT</span>}
              </div>
              {!isEl&&<p className="text-[8px] text-center mt-1 font-semibold text-red-600">needs 2★</p>}
            </button>
          );
        })}
        {cards.length===0&&<div className="col-span-full text-center py-12" style={{color:"rgba(255,244,223,0.5)",textShadow:"1px 1px 4px rgba(0,0,0,0.9)"}}><p className="font-semibold">No {chapter.title} cards yet.</p></div>}
      </div>
      <div className="max-w-4xl mx-auto flex justify-center">
        <button onClick={onFight} disabled={!canFight||starting}
          style={{fontSize:"clamp(0.85rem,2vw,1.1rem)",padding:"clamp(14px,2.5vw,18px) clamp(40px,6vw,72px)",borderRadius:"16px",background:canFight?`linear-gradient(135deg,${chapter.color},${chapter.dark})`:"rgba(255,255,255,0.08)",color:canFight?"#fff":"rgba(255,255,255,0.3)",boxShadow:canFight?`0 6px 0 ${chapter.dark},0 0 30px ${chapter.glow}55`:"none",letterSpacing:"0.12em",fontWeight:900,textTransform:"uppercase",cursor:(!canFight||starting)?"not-allowed":"pointer",border:"none",opacity:(!canFight||starting)?0.5:1,transition:"transform 0.1s,box-shadow 0.1s"}}
          {...press()}
        >{starting?"Starting…":canFight?"◆ FIGHT":`Select ${DECK_SIZE-selectedDeck.length} more`}</button>
      </div>
    </div>
  );
}

// ═══════════════ BATTLE HUD ══════════════════════════════════════════════════
// Redesigned: question+answers in a proper dark glass panel,
// cards at bottom as a fan, bears visible as atmosphere on the sides.
function BattleHUD({session,chapter,onSubmit,submitting,onRefresh,onExit,onHelp}){
  const[selectedAnswer,   setSelectedAnswer]   = useState("");
  const[selectedCardId,   setSelectedCardId]   = useState("");
  const[visibleOptions,   setVisibleOptions]   = useState([]);
  const[eliminatedOption, setEliminatedOption] = useState(null);
  const[preTurnLoading,   setPreTurnLoading]   = useState(false);

  const question=session?.next_question||null;
  const hand=Array.isArray(session?.hand)?session.hand:[];
  const isActive=session?.status==="active";
  const meterPct=Math.max(0,Math.min(1,Number(session?.meter_percent??0.5)));

  useEffect(()=>{
    setEliminatedOption(null);
    setVisibleOptions(question?.options||[]);
  },[question?.id]);

  const handleCardSelect=async(cardId)=>{
    if(selectedCardId===cardId){setSelectedCardId("");setEliminatedOption(null);setVisibleOptions(question?.options||[]);return;}
    setSelectedCardId(cardId);
    const card=hand.find(c=>c.card_id===cardId);
    if(card?.star_level>=4&&session?.session_id){
      setPreTurnLoading(true);
      try{
        const res=await callPreTurn(session.session_id,cardId);
        if(res?.removed_option){setEliminatedOption(res.removed_option);setVisibleOptions(res.modified_options||question?.options||[]);toast.success(`◆ 4★ ability — eliminated option`,{duration:2000});if(selectedAnswer===res.removed_option)setSelectedAnswer("");}
      }catch{}finally{setPreTurnLoading(false);}
    }else{setEliminatedOption(null);setVisibleOptions(question?.options||[]);}
  };

  if(!isActive&&session?.status) return <EndScreen session={session} chapter={chapter} onAction={onExit}/>;

  const meterHue=Math.round(meterPct*120);

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:"56px",position:"relative"}}>
      <style>{CSS}</style>

      {/* ── TOP: meter strip ── */}
      <div style={{padding:"6px 14px 2px",position:"relative",zIndex:2}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
          <span style={{color:"#f87171",fontWeight:900,fontSize:"clamp(11px,2.5vw,13px)",textShadow:"1px 2px 0 rgba(0,0,0,0.9)"}}>◈ {session?.lose_threshold}</span>
          <div>
            <span style={{color:"#fff4df",fontWeight:900,fontSize:"clamp(12px,3vw,15px)",textShadow:"1px 2px 0 rgba(0,0,0,0.9)"}}>
              {session?.battle_meter>0?`+${session.battle_meter}`:session?.battle_meter}
            </span>
            {session?.correct_streak>0&&<span style={{marginLeft:"8px",color:"#fb923c",fontWeight:800,fontSize:"11px",textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>{session.correct_streak}✦</span>}
          </div>
          <span style={{color:"#fbbf24",fontWeight:900,fontSize:"clamp(11px,2.5vw,13px)",textShadow:"1px 2px 0 rgba(0,0,0,0.9)"}}>✦ {session?.win_threshold}</span>
        </div>
        <div style={{height:"18px",borderRadius:"999px",overflow:"hidden",background:"rgba(0,0,0,0.7)",border:"2px solid rgba(255,255,255,0.14)"}}>
          <div className="meter" style={{height:"100%",width:`${meterPct*100}%`,background:`linear-gradient(90deg,#ef4444 0%,#eab308 48%,#22c55e 100%)`,backgroundSize:"200% 100%",backgroundPosition:`${(1-meterPct)*100}% 0`,boxShadow:`0 0 10px hsl(${meterHue},85%,55%)`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"3px",alignItems:"center"}}>
          <span style={{color:"rgba(255,244,223,0.55)",fontSize:"11px",fontWeight:600,textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>Turn {session?.current_turn}/{session?.max_turns}</span>
          {session?.last_action&&(
            <span style={{color:"rgba(255,244,223,0.55)",fontSize:"10px",fontStyle:"italic",textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>
              {session.last_action.feedback}
              {session.last_action.meter_delta!==0&&<span style={{marginLeft:"4px",fontWeight:900,fontStyle:"normal",color:session.last_action.meter_delta>0?"#4ade80":"#f87171"}}>{session.last_action.meter_delta>0?`+${session.last_action.meter_delta}`:session.last_action.meter_delta}</span>}
            </span>
          )}
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <button onClick={onHelp} style={{width:"20px",height:"20px",borderRadius:"50%",background:chapter.color,color:"#fff",fontWeight:900,fontSize:"10px",border:"none",cursor:"pointer"}}>?</button>
            <button onClick={onRefresh} style={{color:"rgba(255,244,223,0.45)",fontSize:"11px",background:"none",border:"none",cursor:"pointer",fontWeight:700,textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>↻</button>
            <button onClick={onExit} style={{color:"rgba(255,100,100,0.75)",fontSize:"11px",background:"none",border:"none",cursor:"pointer",fontWeight:700,textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>✕</button>
          </div>
        </div>
      </div>

      {/* ── CENTRE: battle panel ── */}
      {question&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 16px 0",position:"relative",zIndex:2}}>
          {/* Solid dark panel — no more bears bleeding through */}
          <div style={{
            width:"100%",maxWidth:"600px",
            background:"rgba(10,6,3,0.88)",
            backdropFilter:"blur(12px)",
            border:`2px solid ${chapter.color}55`,
            borderRadius:"20px",
            padding:"20px 22px",
            boxShadow:`0 0 0 1px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.7), 0 0 30px ${chapter.glow}22`,
            animation:"panelIn 0.35s ease both",
          }}>
            {/* Chapter label */}
            <p style={{color:chapter.color,fontWeight:900,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:"10px"}}>
              Chapter {chapter.number} — {chapter.title}
            </p>

            {/* Question */}
            <h2 style={{color:"#fff4df",fontWeight:900,fontSize:"clamp(1.35rem,4vw,2.1rem)",lineHeight:1.25,marginBottom:"6px"}}>
              {question.question_fi}
            </h2>
            {question.question_en&&(
              <p style={{color:"rgba(255,244,223,0.5)",fontSize:"clamp(11px,1.8vw,13px)",fontStyle:"italic",marginBottom:"14px"}}>
                {question.question_en}
              </p>
            )}

            {preTurnLoading&&<p style={{color:"#fbbf24",fontSize:"12px",fontWeight:900,marginBottom:"8px"}}>◆ Activating 4★ ability…</p>}

            {/* Answer options — solid contrast */}
            <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
              {question.options.map((option,idx)=>{
                const isElim=option===eliminatedOption;
                const isSel=selectedAnswer===option;
                if(isElim) return(
                  <div key={option} style={{padding:"11px 16px",borderRadius:"11px",background:"rgba(185,28,28,0.12)",border:"1.5px solid rgba(185,28,28,0.3)",color:"rgba(255,100,100,0.4)",textDecoration:"line-through",fontSize:"clamp(12px,2vw,15px)"}}>
                    <span style={{opacity:0.4,marginRight:"8px"}}>{String.fromCharCode(65+idx)}.</span>{option}
                  </div>
                );
                return(
                  <button key={option} onClick={()=>setSelectedAnswer(option)}
                    style={{
                      textAlign:"left",padding:"11px 16px",borderRadius:"11px",
                      background:isSel?`${chapter.color}22`:"rgba(255,255,255,0.06)",
                      border:`1.5px solid ${isSel?chapter.color:"rgba(255,255,255,0.12)"}`,
                      borderLeft:isSel?`4px solid ${chapter.color}`:`1.5px solid rgba(255,255,255,0.12)`,
                      color:isSel?"#fff4df":"rgba(255,244,223,0.82)",
                      fontSize:"clamp(12px,2vw,15px)",fontWeight:isSel?800:600,
                      cursor:"pointer",transition:"all 0.13s",
                      boxShadow:isSel?`0 0 12px ${chapter.glow}44`:"none",
                    }}
                  >
                    <span style={{opacity:0.4,marginRight:"8px",fontWeight:700}}>{String.fromCharCode(65+idx)}.</span>{option}
                  </button>
                );
              })}
            </div>

            {/* Status + submit INSIDE the panel */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"14px",paddingTop:"12px",borderTop:`1px solid ${chapter.color}33`}}>
              <div style={{display:"flex",gap:"10px",fontSize:"11px",color:"rgba(255,244,223,0.5)"}}>
                <span style={{color:selectedAnswer?"#4ade80":"rgba(255,255,255,0.28)",fontWeight:700}}>{selectedAnswer?"✓ Answer":"○ Answer"}</span>
                <span>+</span>
                <span style={{color:selectedCardId?"#4ade80":"rgba(255,255,255,0.28)",fontWeight:700}}>{selectedCardId?"✓ Card":"○ Card"}</span>
              </div>
              <button
                onClick={()=>onSubmit(selectedAnswer,selectedCardId)}
                disabled={submitting||!selectedAnswer||!selectedCardId}
                style={{
                  padding:"9px 24px",borderRadius:"10px",
                  background:(selectedAnswer&&selectedCardId)?`linear-gradient(135deg,${chapter.color},${chapter.dark})`:"rgba(255,255,255,0.08)",
                  color:"#fff",fontWeight:900,fontSize:"13px",
                  textTransform:"uppercase",letterSpacing:"0.1em",
                  border:"none",cursor:(submitting||!selectedAnswer||!selectedCardId)?"not-allowed":"pointer",
                  opacity:(submitting||!selectedAnswer||!selectedCardId)?0.35:1,
                  boxShadow:(selectedAnswer&&selectedCardId)?`0 4px 0 ${chapter.dark}`:"none",
                  transition:"transform 0.1s,box-shadow 0.1s",
                }}
                onMouseDown={(e)=>{if(selectedAnswer&&selectedCardId){e.currentTarget.style.transform="translateY(4px)";e.currentTarget.style.boxShadow="none";}}}
                onMouseUp={(e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                onMouseLeave={(e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
              >{submitting?"…":"◆ Submit"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM: card hand fan ── */}
      {question&&(
        <div style={{padding:"10px 12px 10px",position:"relative",zIndex:2}}>
          <div style={{display:"flex",gap:"10px",justifyContent:"center",alignItems:"flex-end",overflowX:"auto",paddingBottom:"6px",scrollbarWidth:"none"}}>
            {hand.map((card,idx)=>{
              const r=RARITY[card.rarity]||RARITY.Common;
              const isSel=selectedCardId===card.card_id;
              const stars=Array.from({length:4},(_,j)=>j<card.star_level?"★":"☆").join("");
              const baseRot=(idx-(hand.length-1)/2)*3;
              return(
                <button key={card.card_id} onClick={()=>handleCardSelect(card.card_id)}
                  className="ci shrink-0 cursor-pointer transition-all duration-200 relative"
                  style={{
                    animationDelay:`${idx*0.07}s`,
                    width:"clamp(90px,16vw,120px)",
                    height:"clamp(124px,22vw,164px)",
                    borderRadius:"13px",
                    border:`2.5px solid ${isSel?r.border:"rgba(255,255,255,0.22)"}`,
                    background:isSel?r.bg:"rgba(6,4,2,0.91)",
                    boxShadow:isSel?`0 0 22px ${r.glow},0 -6px 20px rgba(0,0,0,0.5)`:"0 -2px 10px rgba(0,0,0,0.5)",
                    transform:isSel?`rotate(0deg) translateY(-18px) scale(1.15)`:`rotate(${baseRot}deg) translateY(0)`,
                    padding:"8px 8px 6px",
                    display:"flex",flexDirection:"column",justifyContent:"space-between",
                  }}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                    <span style={{fontSize:"8px",fontWeight:900,padding:"2px 6px",borderRadius:"999px",background:r.badge,color:"#fff",letterSpacing:"0.06em"}}>{card.rarity?.charAt(0)||"C"}</span>
                    {card.star_level>=4&&<span style={{fontSize:"9px",fontWeight:900,color:"#fbbf24"}}>◆</span>}
                  </div>
                  <div style={{textAlign:"center",padding:"2px 0"}}>
                    <p style={{fontWeight:900,fontSize:card.word_fi.length>10?"10px":card.word_fi.length>7?"12px":"14px",color:isSel?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.88)",lineHeight:1.2,wordBreak:"break-word"}}>{card.word_fi}</p>
                  </div>
                  <div style={{textAlign:"center",fontSize:"11px",color:isSel?r.border:"rgba(255,255,255,0.5)",fontWeight:700}}>{stars}</div>
                  {isSel&&<div style={{position:"absolute",bottom:"-9px",left:"50%",transform:"translateX(-50%)",background:r.border,color:"#fff",fontSize:"7px",fontWeight:900,padding:"2px 8px",borderRadius:"999px",whiteSpace:"nowrap"}}>PLAYED</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ END SCREEN ═══════════════════════════════════════════════════
function EndScreen({session,chapter,onAction}){
  const navigate=useNavigate();
  const won=session?.status==="won";
  const lost=session?.status==="lost";
  return(
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{background:"rgba(0,0,0,0.75)"}}>
      <style>{CSS}</style>
      <div style={{animation:"fadeUp 0.5s ease both"}}>
        <p style={{fontSize:"clamp(4rem,15vw,7rem)",fontWeight:900,lineHeight:1,color:won?"#fbbf24":lost?"#f87171":"#fff4df"}}>{won?"✦":lost?"◈":"◆"}</p>
        <h2 style={{fontSize:"clamp(2.5rem,9vw,5rem)",fontWeight:900,color:won?"#fbbf24":lost?"#f87171":"#fff4df",marginTop:"12px",textShadow:"2px 3px 0 rgba(0,0,0,0.85)"}}>{won?"VICTORY":lost?"DEFEATED":"DRAW"}</h2>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"16px",marginTop:"16px",fontSize:"14px",color:"rgba(255,244,223,0.5)",textShadow:"1px 1px 0 rgba(0,0,0,0.9)"}}>
          <span>Meter <strong style={{color:"#fff4df"}}>{session?.battle_meter}</strong></span>
          <span>XP <strong style={{color:"#a78bfa"}}>+{session?.xp_earned}</strong></span>
          <span>Streak <strong style={{color:"#fb923c"}}>{session?.max_streak}✦</strong></span>
          {session?.bonus_packs>0&&<span>Packs <strong style={{color:"#fbbf24"}}>+{session.bonus_packs}</strong></span>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"12px",marginTop:"28px"}}>
          {[["Play Again",onAction,`linear-gradient(135deg,${chapter.color},${chapter.dark})`,"#fff"],["Collection",()=>navigate("/profile"),"rgba(255,255,255,0.08)","rgba(255,244,223,0.75)"],["Home",()=>navigate("/"),"rgba(185,28,28,0.5)","white"]].map(([label,action,bg,color])=>(
            <button key={label} onClick={action}
              style={{padding:"10px 24px",borderRadius:"12px",background:bg,color,fontWeight:900,fontSize:"13px",textTransform:"uppercase",letterSpacing:"0.08em",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",transition:"transform 0.1s,box-shadow 0.1s"}}
              {...press()}
            >{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════ MAIN ════════════════════════════════════════════════════════
const ChallengePage=()=>{
  const navigate=useNavigate();
  const[screen,setScreen]=useState("map");
  const[selectedChapter,setSelectedChapter]=useState(null);
  const[unlocked,setUnlocked]=useState(["cafe_order"]);
  const[chapterCards,setChapterCards]=useState([]);
  const[selectedDeck,setSelectedDeck]=useState([]);
  const[session,setSession]=useState(null);
  const[starting,setStarting]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[collectingRewards,setCollectingRewards]=useState(false);
  const[showHelp,setShowHelp]=useState(false);

  useEffect(()=>{getScenarioUnlocks().then(setUnlocked).catch(()=>{});},[]);

  const handleSelectChapter=async(ch)=>{
    setSelectedChapter(ch);setSelectedDeck([]);setScreen("deck");
    try{const data=await getCollectionByScenario(ch.scenario);setChapterCards(Array.isArray(data?.cards)?data.cards:(Array.isArray(data)?data:[]));}
    catch{setChapterCards([]);}
  };
  const handleToggle=(id)=>setSelectedDeck(p=>p.includes(id)?p.filter(x=>x!==id):p.length<DECK_SIZE?[...p,id]:p);
  const handleFight=async()=>{
    if(selectedDeck.length!==DECK_SIZE)return;setStarting(true);
    try{const data=await startChallenge({scenario:selectedChapter.scenario,deck:selectedDeck});setSession(data);setScreen("battle");toast.success("Battle started!");}
    catch(e){toast.error(er(e,"Failed to start."));}finally{setStarting(false);}
  };
  const handleSubmit=async(selectedAnswer,selectedCardId)=>{
    if(!session?.session_id||submitting)return;
    const question=session?.next_question;if(!question)return;
    let before=[];try{const col=await getMyCollection();before=Array.isArray(col?.cards)?col.cards:[];}catch{}
    setSubmitting(true);
    try{
      const next=await submitChallengeAction({sessionId:session.session_id,questionId:question.id,answerCardId:selectedCardId,givenAnswer:selectedAnswer});
      Boolean(next?.last_action?.is_correct)?toast.success(next?.last_action?.feedback||"Correct!"):toast.error(next?.last_action?.feedback||"Wrong.");
      setSession(next);
      if(next?.status==="won"){
        toast.success("Victory! Collecting rewards…",{duration:2000});setCollectingRewards(true);
        try{const rewards=await pollRewards(before);if(rewards.length>0){navigate("/reward",{state:{cards:rewards,challenge:{name:`◆ Chapter ${selectedChapter?.number} Victory!`},roundSummary:false}});return;}}catch{}
        setCollectingRewards(false);
      }
    }catch(e){toast.error(er(e,"Failed to submit."));}finally{setSubmitting(false);}
  };
  const handleExit=()=>{setSession(null);setSelectedDeck([]);setSelectedChapter(null);setCollectingRewards(false);setScreen("map");};
  const handleRefresh=async()=>{if(!session?.session_id)return;try{const d=await getChallengeState(session.session_id);setSession(d);}catch(e){toast.error(er(e,"Refresh failed."));}};

  return(
    <main style={{backgroundImage:"url(/images/challenge.png)"}} className="bg-cover bg-center min-h-screen">
      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)} chapter={selectedChapter}/>}
      {collectingRewards&&createPortal(<div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><p style={{color:"#fbbf24",fontWeight:900,fontSize:"28px",textShadow:"2px 3px 0 rgba(0,0,0,0.85)"}}>Victory!</p><p style={{color:"rgba(255,244,223,0.55)",fontSize:"14px",marginTop:"8px"}}>Collecting rewards…</p></div>,document.body)}
      {screen==="map"&&<StoryMap unlocked={unlocked} onSelect={handleSelectChapter} navigate={navigate}/>}
      {screen==="deck"&&selectedChapter&&<DeckBuilder chapter={selectedChapter} cards={chapterCards} selectedDeck={selectedDeck} onToggle={handleToggle} onFight={handleFight} onBack={()=>setScreen("map")} starting={starting} onHelp={()=>setShowHelp(true)}/>}
      {screen==="battle"&&session&&selectedChapter&&<BattleHUD session={session} chapter={selectedChapter} onSubmit={handleSubmit} submitting={submitting} onRefresh={handleRefresh} onExit={handleExit} onHelp={()=>setShowHelp(true)}/>}
    </main>
  );
};

export default ChallengePage;
