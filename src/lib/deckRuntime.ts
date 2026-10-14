/* Runtime do deck gerado. Controller de navegacao por slides discreteos e
   HUD. Nao existe modo scroll: cada slide eh uma tela.

 * Links externos (http, mailto, tel, target=_blank) nunca navegam dentro do
 * deck: quando o documento roda dentro do app (data-ss-host), o clique vira
 * pedido para abrir no navegador do sistema. Fora do app, o link funciona
 * normalmente, porque a marca nao existe. */

export const DECK_RUNTIME = `
(function(){
  var doc=document;
  var html=doc.documentElement;
  var editing=html.hasAttribute('data-ss-edit');
  var noApp=!html.hasAttribute('data-ss-host');
  var slides=[].slice.call(doc.querySelectorAll('.ss-slide'));
  var total=slides.length;
  var i=0;
  var bar=doc.querySelector('.ss-progress span');
  var counter=doc.querySelector('.ss-count');

  function hud(){
    var n=Math.min(i+1,total);
    if(bar){bar.style.width=total?((n/total)*100)+'%':'0%'}
    if(counter){counter.textContent=n+' / '+total}
  }
  function clearActive(){
    for(var k=0;k<slides.length;k++){slides[k].classList.remove('is-active')}
  }
  function goto(target){
    if(!total)return;
    var next=Math.max(0,Math.min(total-1,target));
    if(next===i && slides[i] && slides[i].classList.contains('is-active'))return;
    clearActive();
    i=next;
    var slide=slides[i];
    if(slide){
      slide.classList.add('is-active');
      if(!editing){slide.scrollTop=0}
    }
    hud();
    avisaSlide();
  }
  function next(){goto(i+1)}
  function prev(){goto(i-1)}

  function avisaSlide(){
    if(noApp)return;
    var slide=slides[i];
    var bg='', ink='';
    if(slide){
      var cs=getComputedStyle(slide);
      bg=cs.backgroundColor;
      ink=cs.color;
    }
    try{
      parent.postMessage({source:'slide-stage-deck',t:'slide-changed',index:i,bg:bg,ink:ink},'*');
    }catch(err){}
  }

  /* ---- entrada: primeiro slide visivel ---- */
  if(total){
    slides[0].classList.add('is-active');
    hud();
  }

  /* ---- links: nunca navegam o documento do deck ---- */
  function slideIndexFromHash(href){
    var m=/^#slide-(\\d+)$/.exec(href||'');
    if(!m)return null;
    var n=parseInt(m[1],10)-1;
    if(isNaN(n)||n<0||n>=total)return null;
    return n;
  }
  function isExternal(a){
    var href=(a.getAttribute('href')||'').trim();
    if(a.getAttribute('target')==='_blank')return true;
    if(href.indexOf('mailto:')===0||href.indexOf('tel:')===0)return true;
    // Block dangerous URI schemes that can execute code
    if(/^javascript:/i.test(href))return true;
    if(/^vbscript:/i.test(href))return true;
    if(/^data:/i.test(href))return true;
    if(/^(https?:)?\\/\\//i.test(href))return true;
    if(/^[a-z][a-z0-9+.-]*:/i.test(href))return true;
    return false;
  }
  doc.addEventListener('click',function(ev){
    var t=ev.target;
    var a=t&&t.closest?t.closest('a[href]'):null;
    if(!a)return;
    /* No modo de edicao o clique do mouse seleciona o elemento (o editor ja
       segura o pointerdown), mas Enter num botao focado dispara clique sem
       pointerdown: aqui a navegacao tambem fica bloqueada. */
    if(editing){ev.preventDefault();ev.stopPropagation();return}
    var href=a.getAttribute('href')||'';
    /* Link interno do deck: vai direto ao slide, sem hash na URL. Confiar
       no default quebraria o deck (em iframe srcdoc o hash navega o
       documento para fora). */
    var alvo=slideIndexFromHash(href);
    if(alvo!==null){
      ev.preventDefault();
      ev.stopPropagation();
      goto(alvo);
      return;
    }
    if(!isExternal(a))return;
    ev.preventDefault();
    ev.stopPropagation();
    if(noApp)return;
    try{
      parent.postMessage({source:'slide-stage-deck',t:'open-external',href:href},'*');
    }catch(err){}
  },true);

  /* Formulario dentro do slide nao navega o documento do deck. */
  doc.addEventListener('submit',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
  },true);

  /* ---- teclado ---- */
  if(!editing){
    doc.addEventListener('keydown',function(ev){
      var tag=(ev.target&&ev.target.tagName)||'';
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
      var k=ev.key;
      if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '){ev.preventDefault();next()}
      else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){ev.preventDefault();prev()}
      else if(k==='Home'){ev.preventDefault();goto(0)}
      else if(k==='End'){ev.preventDefault();goto(total-1)}
      else if(k==='f'||k==='F'){ev.preventDefault();toggleFull()}
    });
  }

  /* ---- toque ---- */
  if(!editing){
    var x0=null,y0=null;
    doc.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
    doc.addEventListener('touchend',function(e){
      if(x0===null)return;
      var dx=e.changedTouches[0].clientX-x0;
      var dy=e.changedTouches[0].clientY-y0;
      if(Math.abs(dx)>56&&Math.abs(dx)>Math.abs(dy)){dx<0?next():prev()}
      x0=null;y0=null;
    },{passive:true});
  }

  /* ---- clique nas laterais ---- */
  if(!editing){
    doc.addEventListener('click',function(ev){
      var t=ev.target;
      if(t.closest&&t.closest('a,button,input,textarea,select,label,video,audio,[data-interactive]'))return;
      if(doc.body.getAttribute('data-advance')==='false')return;
      var w=window.innerWidth;
      ev.clientX>w*0.66?next():ev.clientX<w*0.33&&prev();
    });
  }

  function toggleFull(){
    if(doc.fullscreenElement){doc.exitFullscreen()}
    else if(doc.documentElement.requestFullscreen){doc.documentElement.requestFullscreen()}
  }

  window.SlideStageDeck={goto:goto,next:next,prev:prev,count:total,index:function(){return i},full:toggleFull};

  /* ---- links internos pela URL (#slide-2), para quem colar o link ---- */
  function fromHash(){
    var alvo=slideIndexFromHash(location.hash||'');
    if(alvo===null)return;
    goto(alvo);
  }
  window.addEventListener('hashchange',fromHash);
  fromHash();
})();
`
