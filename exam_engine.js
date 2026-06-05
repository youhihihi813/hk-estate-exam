// exam_engine.js
function shuffle(a){return[...a].sort(()=>Math.random()-.5);}

function generateExam(){
  const map={};
  BANK.forEach((q,i)=>{(map[q.area]=map[q.area]||[]).push(i);});
  const sel=[],used=new Set();
  shuffle(Object.keys(map)).forEach(area=>{
    for(const i of shuffle(map[area])){if(!used.has(i)){used.add(i);sel.push(i);break;}}
  });
  for(const i of shuffle([...Array(BANK.length).keys()].filter(i=>!used.has(i)))){
    if(sel.length>=30)break; sel.push(i); used.add(i);
  }
  return shuffle(sel).map(i=>BANK[i]);
}

// Pick exactly 10 case-type + 10 land-type questions
const caseStudy=(()=>{
  const c=CASES[Math.floor(Math.random()*CASES.length)];
  const caseQs=shuffle(c.questions.filter(q=>q.type==='case')).slice(0,10);
  const landQs=shuffle(c.questions.filter(q=>q.type==='land')).slice(0,10);
  return {...c, questions:[...caseQs,...landQs]};
})();
const part1Qs=generateExam();
const examQs=[...part1Qs,...caseStudy.questions];

let answers=new Array(50).fill(null);
let cur=0,timerSec=10800,timerInt=null,submitted=false;

function fmt(s){const h=~~(s/3600),m=~~(s%3600/60),sc=s%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;}
function startTimer(){
  timerInt=setInterval(()=>{
    timerSec--;
    const el=document.getElementById('timer');
    el.textContent=fmt(timerSec);
    if(timerSec<=600)el.className='warn';
    if(timerSec<=120)el.className='danger';
    if(timerSec<=0){clearInterval(timerInt);submitExam();}
  },1000);
}

// English Land Register
const KEY_EN={'地段編號':'Lot Number','政府租契年期':'Government Lease Term','租契開始日期':'Commencement Date','地租':'Government Rent','物業地址':'Property Address','所佔地段份數':'Undivided Shares','物業類別':'Property Type / Category'};
function buildLandReg(lr){
  let h=`<div class="land-reg"><h4>🏛 LAND REGISTER — ${lr.property}</h4><table>`;
  h+=`<tr><th colspan="2" class="section-title">PROPERTY PARTICULARS</th></tr>`;
  lr.leaseInfo.forEach(([k,v])=>{h+=`<tr><td><strong>${KEY_EN[k]||k}</strong></td><td>${v}</td></tr>`;});
  h+=`<tr><th colspan="7" class="section-title">OWNER PARTICULARS</th></tr>`;
  h+=`<tr><th>Ref. No.</th><th>Instrument Date</th><th>Reg. Date</th><th>Capacity</th><th>Owner Name</th><th>Consideration</th><th>Remarks</th></tr>`;
  lr.owners.forEach(r=>{h+=`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`;});
  h+=`<tr><th colspan="7" class="section-title">INCUMBRANCES</th></tr>`;
  h+=`<tr><th>Ref. No.</th><th>Instrument Date</th><th>Reg. Date</th><th>Nature</th><th>Party</th><th>Amount</th><th>Remarks</th></tr>`;
  lr.incumbrances.forEach(r=>{h+=`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`;});
  h+=`</table></div>`;
  return h;
}

function renderQ(idx){
  const q=examQs[idx];
  const isCaseQ=idx>=30&&idx<40;  // Q31-40: case scenario
  const isLandQ=idx>=40;           // Q41-50: land register
  let html='';

  // Part / section headers
  if(idx===0)  html+=`<div class="part-hdr"><h3>第一部分 — Part 1 選擇題</h3><p>共30題獨立選擇題，每題5個選項，選出最佳答案。兩部分各需達60%方為合格。</p></div>`;
  if(idx===30) html+=`<div class="part-hdr"><h3>第二部分（甲）— 個案分析 Q31–40</h3><p>${caseStudy.title}</p><p style="margin-top:6px;font-size:11px;opacity:.8">請根據以下個案內容作答第31至40題。</p></div>`;
  if(idx===40) html+=`<div class="part-hdr part-hdr-land"><h3>第二部分（乙）— Land Register Q41–50</h3><p>All questions are based on the Land Register below. 請根據以下英文土地查冊作答第41至50題。</p></div>`;

  // Show case narrative for Q31-40
  if(isCaseQ){
    const isFirst=idx===30;
    html+=`<details class="case-details"${isFirst?' open':''}>
      <summary>📋 個案內容（${isFirst?'點擊收起':'點擊展開'}）</summary>
      <div class="case-inner"><div class="case-text">${caseStudy.narrative}</div></div>
    </details>`;
  }
  // Show land register for Q41-50
  if(isLandQ){
    const isFirst=idx===40;
    html+=`<details class="case-details"${isFirst?' open':''}>
      <summary>🏛 Land Register（${isFirst?'Click to collapse':'Click to expand'}）</summary>
      <div class="case-inner">${buildLandReg(caseStudy.landReg)}</div>
    </details>`;
  }

  const keys=['A','B','C','D','E'],uAns=answers[idx];
  html+=`<div class="q-card">
    <div class="q-area">Q${idx+1} ／ ${q.area}</div>
    <div class="q-text">${q.q}</div>
    <div class="opts" id="opts-${idx}">`;
  q.opts.forEach((opt,i)=>{
    const k=keys[i];
    let cls='';
    if(submitted){if(k===q.ans)cls='correct';else if(k===uAns)cls='wrong';}
    else if(k===uAns)cls='sel';
    html+=`<div class="opt ${cls}" onclick="pick(${idx},'${k}')"><span class="opt-k">${k}</span><span>${opt.slice(3)}</span></div>`;
  });
  html+=`</div>`;
  if(submitted) html+=`<div class="explanation">💡 <strong>解析：</strong>${q.exp}</div>`;
  html+=`</div>`;

  document.getElementById('exam-body').innerHTML=html;
  updNav(idx);
  updQNav();
  updProg();
  window.scrollTo(0,0);
}

function pick(idx,k){
  if(submitted)return;
  answers[idx]=k;
  document.querySelectorAll(`#opts-${idx} .opt`).forEach((el,i)=>{el.className='opt'+(['A','B','C','D','E'][i]===k?' sel':'');});
  updQNav(); updProg();
}

function updQNav(){
  const nav=document.getElementById('q-nav');
  if(!nav)return;
  const mk=(i)=>`<div class="qn${answers[i]!==null?' done':''}${i===cur?' cur':''}" onclick="jumpTo(${i})">${i+1}</div>`;
  let h=`<div class="qn-label">第一部分</div><div class="qn-grid">`;
  for(let i=0;i<30;i++) h+=mk(i);
  h+=`</div><div class="qn-divider"></div><div class="qn-label">個案分析</div><div class="qn-grid">`;
  for(let i=30;i<40;i++) h+=mk(i);
  h+=`</div><div class="qn-divider"></div><div class="qn-label">Land Register</div><div class="qn-grid">`;
  for(let i=40;i<50;i++) h+=mk(i);
  const done=answers.filter(a=>a!==null).length;
  h+=`</div><div class="qn-summary">🟢 已答 ${done}<br>🔴 未答 ${50-done}</div>`;
  nav.innerHTML=h;
}

function jumpTo(i){cur=i;renderQ(i);}
function updNav(idx){
  document.getElementById('btn-prev').disabled=idx===0;
  const last=idx===49;
  document.getElementById('btn-next').style.display=last?'none':'';
  document.getElementById('btn-submit').style.display=(last&&!submitted)?'':'none';
  const lbl=idx<30?'第一部分 (Q1–30)':idx<40?'個案分析 (Q31–40)':'Land Register (Q41–50)';
  document.getElementById('part-label').textContent=lbl;
}
function updProg(){document.getElementById('prog-fill').style.width=(answers.filter(a=>a!==null).length/50*100)+'%';}
function goPrev(){if(cur>0){cur--;renderQ(cur);}}
function goNext(){if(cur<49){cur++;renderQ(cur);}}

function startExam(){
  document.getElementById('cover').style.display='none';
  document.getElementById('exam').style.display='block';
  renderQ(0); startTimer();
}

function submitExam(){
  const blank=answers.filter(a=>a===null).length;
  if(blank>0&&!confirm(`仍有 ${blank} 題未作答，確定提交？`))return;
  submitted=true; clearInterval(timerInt);
  document.getElementById('btn-submit').style.display='none';
  const p1c=part1Qs.filter((q,i)=>answers[i]===q.ans).length;
  const p2c=caseStudy.questions.filter((q,i)=>answers[30+i]===q.ans).length;
  showResults(p1c,Math.round(p1c/30*100),p2c,Math.round(p2c/20*100));
}

function showResults(p1c,p1p,p2c,p2p){
  document.getElementById('exam').style.display='none';
  const res=document.getElementById('results');
  res.style.display='block';
  const passed=p1p>=60&&p2p>=60,tot=p1c+p2c,totp=Math.round(tot/50*100);
  let rev='';
  examQs.forEach((q,i)=>{
    const ua=answers[i],ok=ua===q.ans,sk=ua===null;
    const tc=sk?'rs':ok?'rc':'rw';
    rev+=`<div class="rev-card ${tc}">
      <div class="rev-q">${sk?'⬜':ok?'✅':'❌'} <strong>Q${i+1}.</strong> ${q.q}</div>
      <div class="rev-ans">${ok?'<span class="ans-c">正確：'+q.ans+'</span>':(sk?'<span class="ans-s">未作答</span>':'<span class="ans-u">你：'+ua+'</span>')+'<span class="ans-c">正確：'+q.ans+'</span>'}</div>
      <div class="explanation">💡 ${q.exp}</div></div>`;
  });
  res.innerHTML=`<div class="res-hdr"><h2>考試結果</h2>
    <div class="verdict ${passed?'v-pass':'v-fail'}">${passed?'🎉 恭喜合格！':'❌ 未達合格標準'}</div>
    <p style="color:var(--muted);font-size:13px">兩部分均須達60%方為合格</p></div>
  <div class="score-grid">
    <div class="sc"><h4>第一部分 (Q1–30)</h4><div class="sc-big ${p1p>=60?'col-pass':'col-fail'}">${p1p}%</div>
      <div class="sc-sub">${p1c}/30 題正確</div><div class="sc-note ${p1p>=60?'n-pass':'n-fail'}">${p1p>=60?'✅ 合格':'❌ 未合格（需≥60%）'}</div></div>
    <div class="sc"><h4>第二部分 (Q31–50)</h4><div class="sc-big ${p2p>=60?'col-pass':'col-fail'}">${p2p}%</div>
      <div class="sc-sub">${p2c}/20 題正確</div><div class="sc-note ${p2p>=60?'n-pass':'n-fail'}">${p2p>=60?'✅ 合格':'❌ 未合格（需≥60%）'}</div></div>
    <div class="sc" style="grid-column:1/-1"><h4>總分</h4><div class="sc-big ${passed?'col-pass':'col-fail'}">${totp}%</div>
      <div class="sc-sub">${tot}/50 題正確</div></div>
  </div>
  <div class="rev-section"><h3>所有題目詳解</h3>${rev}</div>
  <div class="btn-row">
    <button class="btn btn-primary" onclick="goReview()">重溫考卷</button>
    <button class="btn btn-secondary" onclick="location.reload()">重新考試（新題目）</button>
  </div>`;
}

function goReview(){
  document.getElementById('results').style.display='none';
  document.getElementById('exam').style.display='block';
  cur=0; renderQ(0);
  document.getElementById('btn-submit').style.display='none';
}

// ── TRAINING MODE ──────────────────────────────
let tQueue=[], tIdx=0, tCorrect=0, tTotal=0, tDone=false, tCurQ=null;

function startTraining(){
  document.getElementById('cover').style.display='none';
  document.getElementById('training').style.display='block';
  // Shuffle ALL bank questions; reshuffle when exhausted
  tQueue=shuffle([...BANK]);
  tIdx=0; tCorrect=0; tTotal=0;
  renderTrainQ();
}

function renderTrainQ(){
  // Reshuffle when queue exhausted
  if(tIdx>=tQueue.length){ tQueue=shuffle([...BANK]); tIdx=0; }
  tCurQ=tQueue[tIdx];
  tDone=false;

  const keys=['A','B','C','D','E'];
  let html=`<div class="q-card">
    <div class="q-area">${tCurQ.area}</div>
    <div class="q-text">${tCurQ.q}</div>
    <div class="opts" id="t-opts">`;
  tCurQ.opts.forEach((opt,i)=>{
    const k=keys[i];
    html+=`<div class="opt" id="topt-${k}" onclick="trainPick('${k}')">
      <span class="opt-k">${k}</span><span>${opt.slice(3)}</span></div>`;
  });
  html+=`</div><div id="t-feedback" style="display:none"></div></div>`;

  document.getElementById('training-body').innerHTML=html;
  document.getElementById('t-next').style.display='none';
  document.getElementById('t-qnum').textContent=`第 ${tTotal+1} 題`;
}

function trainPick(k){
  if(tDone)return;
  tDone=true; tTotal++;
  const correct=k===tCurQ.ans;
  if(correct) tCorrect++;

  // Colour all options
  ['A','B','C','D','E'].forEach(ok=>{
    const el=document.getElementById('topt-'+ok);
    if(!el)return;
    if(ok===tCurQ.ans) el.classList.add('correct');
    else if(ok===k)    el.classList.add('wrong');
    el.style.cursor='default';
  });

  // Result + explanation
  const fb=document.getElementById('t-feedback');
  fb.style.display='block';
  fb.innerHTML=`<div class="t-result ${correct?'t-correct':'t-wrong'}">
    ${correct?'✅ 答對了！':'❌ 答錯了　正確答案：'+tCurQ.ans}
  </div>
  <div class="t-exp-text">💡 ${tCurQ.exp}</div>`;

  // Update score pill
  const pct=tTotal>0?Math.round(tCorrect/tTotal*100):0;
  document.getElementById('t-score').textContent=`✅ ${tCorrect} / ${tTotal}（${pct}%）`;
  document.getElementById('t-qnum').textContent=`第 ${tTotal} 題`;
  document.getElementById('t-next').style.display='';
  // Scroll feedback into view
  fb.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function trainNext(){
  tIdx++;
  renderTrainQ();
  window.scrollTo(0,0);
}

function exitTraining(){
  document.getElementById('training').style.display='none';
  document.getElementById('cover').style.display='flex';
}
