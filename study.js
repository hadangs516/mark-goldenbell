'use strict';

// Reuse the quiz's chapter loader, local verse cache, and question highlights.
const savedStudy=db.study&&typeof db.study==='object'?db.study:{};
db.study={chapter:Number.isInteger(savedStudy.chapter)&&savedStudy.chapter>=1&&savedStudy.chapter<=16?savedStudy.chapter:1,highlight:savedStudy.highlight!==false};

function studyTerms(chapter,verse){
 const terms=new Set();
 QUESTIONS.filter(function(q){return q.chapter===chapter&&q.verses.includes(verse);}).forEach(function(q){q.highlights.forEach(function(term){if(term.trim())terms.add(term);});});
 return Array.from(terms);
}
function studyVerseHTML(chapter,verse,text){
 const marked=highlightText(text,studyTerms(chapter,verse)).replace(/<strong>/g,'<mark class="study-highlight">').replace(/<\/strong>/g,'</mark>');
 return '<p class="verse study-verse" id="study-verse-'+verse+'"><sup aria-label="'+verse+'절">'+verse+'</sup>'+marked+'</p>';
}
function renderStudy(){
 const chapter=db.study.chapter;
 dock.hidden=true;
 content.innerHTML='<h2 class="view-title">공부하기</h2><p class="study-intro">말씀을 읽고, 문제에 나오는 핵심 단어를 눈에 담아 보세요.</p>'+
 '<section class="paper study-controls" aria-label="읽을 장 선택"><div class="study-navigation">'+
 '<button class="study-step" data-action="study-chapter" data-chapter="'+(chapter-1)+'" aria-label="이전 장" '+(chapter===1?'disabled':'')+'>'+icon('chevron','study-back')+'</button>'+
 '<div class="study-select"><label for="study-chapter">마가복음 · 개역개정</label><select id="study-chapter">'+Array.from({length:16},function(_,i){return '<option value="'+(i+1)+'" '+(chapter===i+1?'selected':'')+'>마가복음 '+(i+1)+'장</option>';}).join('')+'</select></div>'+
 '<button class="study-step" data-action="study-chapter" data-chapter="'+(chapter+1)+'" aria-label="다음 장" '+(chapter===16?'disabled':'')+'>'+icon('chevron')+'</button></div>'+
 '<label class="study-toggle"><input type="checkbox" id="study-highlight" '+(db.study.highlight?'checked':'')+'><span><mark class="study-highlight">핵심 단어</mark> 형광펜 표시</span></label></section>'+
 '<article class="paper study-reader'+(db.study.highlight?'':' highlights-off')+'" aria-labelledby="study-heading"><header class="study-heading"><div><h3 id="study-heading">마가복음 '+chapter+'장</h3><p>'+escapeHTML(TOPICS[chapter-1])+'</p></div><a href="'+sourceURL(chapter)+'" target="_blank" rel="noopener noreferrer">원문 열기</a></header>'+
 '<div id="study-verses" aria-busy="true"><p class="verse-status" role="status">'+chapter+'장 본문을 불러오고 있어요.</p></div><p class="verse-source" id="study-source"></p></article>'+
 '<p class="help study-help">형광펜은 이 사이트의 문제에 연결된 핵심 단어를 표시해요. 처음 읽는 장은 인터넷 연결이 필요해요.</p>';
 showStudyChapter(chapter,document.getElementById('study-verses'));
}
async function showStudyChapter(chapter,target){
 const request=Date.now()+'-'+Math.random();target.dataset.request=request;target.setAttribute('aria-busy','true');
 const numbers=Array.from({length:CHAPTER_LENGTHS[chapter-1]},function(_,i){return i+1;});
 function isCurrent(){return view==='study'&&target.isConnected&&target.dataset.request===request;}
 function entryFor(n){const entry=verseStore[chapter+':'+n];return entry&&typeof entry.text==='string'&&entry.text.trim()?entry:null;}
 try{
  if(numbers.some(function(n){return !entryFor(n);}))await fetchChapter(chapter);
  if(!isCurrent())return;
  if(numbers.some(function(n){return !entryFor(n);}))throw Error('본문이 완전하지 않습니다.');
  target.innerHTML=numbers.map(function(n){return studyVerseHTML(chapter,n,entryFor(n).text);}).join('');
  document.getElementById('study-source').textContent=numbers.some(function(n){return entryFor(n).source==='user';})?'가져온 본문 포함 · 개역개정':'대한성서공회 · 개역개정';
 }catch(error){
  if(!isCurrent())return;
  target.innerHTML='<div class="study-error"><p class="verse-status error" role="status">'+chapter+'장 전체 본문을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p><div class="verse-tools"><button data-action="study-retry">다시 불러오기</button><button data-action="source">내 본문 가져오기</button></div></div>';
  const available=numbers.filter(function(n){return entryFor(n);});
  if(available.length)target.innerHTML+='<p class="help">저장된 '+available.length+'개 절만 표시하고 있어요. 전체 '+numbers.length+'절을 읽으려면 다시 불러와 주세요.</p>'+available.map(function(n){return studyVerseHTML(chapter,n,entryFor(n).text);}).join('');
 }finally{if(isCurrent())target.setAttribute('aria-busy','false');}
}
function selectStudyChapter(chapter){
 if(!Number.isInteger(chapter)||chapter<1||chapter>16)return;
 db.study.chapter=chapter;save();renderStudy();
 const select=document.getElementById('study-chapter');select.focus({preventScroll:true});
 window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('click',function(event){
 const node=event.target.closest('[data-action]');if(!node||node.disabled||view!=='study')return;
 if(node.dataset.action==='study-chapter')selectStudyChapter(Number(node.dataset.chapter));
 if(node.dataset.action==='study-retry')renderStudy();
});
content.addEventListener('change',function(event){
 if(event.target.id==='study-chapter')selectStudyChapter(Number(event.target.value));
 if(event.target.id==='study-highlight'){
  db.study.highlight=event.target.checked;save();
  content.querySelector('.study-reader').classList.toggle('highlights-off',!db.study.highlight);
 }
});
