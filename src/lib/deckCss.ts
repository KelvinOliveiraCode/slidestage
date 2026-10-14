/* CSS do deck gerado. Vai embutido no HTML único exportado pelo app.
   Regras: só transform e opacity animam, tamanhos de fonte em clamp
   (nunca abaixo do legivel em 1920x1080), prefers-reduced-motion respeitado. */

export const DECK_CSS = `
:root{
  --ss-ink:#F2F5F7;
  --ss-muted:#A8B4BE;
  --ss-bg:#0B0D10;
  --ss-surface:#171C22;
  --ss-line:#303A45;
  --ss-accent:#F5B841;
  --ss-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --ss-mono:ui-monospace,"Cascadia Code",Consolas,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body.ss-deck{
  background:var(--ss-bg);color:var(--ss-ink);font-family:var(--ss-font);
  overflow:hidden;-webkit-font-smoothing:antialiased;
}
.ss-stage{position:fixed;inset:0}

/* ---------- slides ---------- */
.ss-slide{
  position:absolute;inset:0;display:none;place-items:center;
  padding:clamp(24px,4.5vw,72px);
  background:var(--slide-bg,var(--ss-bg));
  color:var(--slide-ink,var(--ss-ink));
  overflow:hidden;
}
.ss-slide.is-active{display:grid}
.ss-content{
  width:100%;max-width:1180px;margin:auto;
  display:flex;flex-direction:column;gap:clamp(12px,1.6vw,22px);
}
.ss-content[data-layout="title"]{text-align:center;align-items:center;justify-content:center}
.ss-content[data-layout="title"] .ss-sub{max-width:34em}
.ss-content[data-layout="statement"]{max-width:26em;justify-content:center}
.ss-content[data-layout="split"]{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(24px,4vw,56px);align-items:center}
.ss-content[data-layout="cards"] .ss-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,1.6vw,22px)}
.ss-content[data-layout="list"] .ss-list{display:flex;flex-direction:column;gap:clamp(10px,1.4vw,18px)}
.ss-content[data-layout="quote"]{text-align:center;align-items:center;justify-content:center}
.ss-content[data-layout="image"]{padding:0;max-width:none}
.ss-content[data-layout="blank"]{max-width:none;height:100%}
.ss-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ss-scrim{
  position:absolute;inset:0;
  background:linear-gradient(180deg,rgb(6 8 11 / .25) 0%,rgb(6 8 11 / .82) 78%);
}
.ss-kicker{
  font-size:clamp(13px,1.25vw,18px);font-weight:650;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ss-accent);margin:0;
}

/* ---------- texto ---------- */
h1,.ss-h1{font-size:clamp(38px,5.6vw,78px);line-height:1.04;font-weight:800;letter-spacing:-.02em;margin:0}
h2,.ss-h2{font-size:clamp(28px,3.4vw,50px);line-height:1.1;font-weight:750;letter-spacing:-.01em;margin:0}
h3,.ss-h3{font-size:clamp(20px,2vw,30px);line-height:1.2;font-weight:700;margin:0}
p,.ss-p{font-size:clamp(17px,1.9vw,27px);line-height:1.45;color:var(--ss-muted);margin:0}
ul,.ss-list{list-style:none;margin:0;padding:0}
li,.ss-list-item{
  font-size:clamp(17px,1.8vw,26px);line-height:1.4;color:var(--ss-ink);
  padding-left:1.4em;position:relative;
}
li::before,.ss-list-item::before{
  content:"";position:absolute;left:0;top:.62em;width:.5em;height:.5em;
  background:var(--ss-accent);border-radius:2px;
}
.ss-sub{font-size:clamp(17px,1.7vw,24px);color:var(--ss-muted)}
.ss-num{font-family:var(--ss-mono);font-size:clamp(14px,1.3vw,19px);color:var(--ss-accent)}
.ss-quote-text{font-size:clamp(26px,3.2vw,46px);line-height:1.2;font-weight:650;margin:0}
.ss-quote-author{font-size:clamp(15px,1.4vw,21px);color:var(--ss-muted);margin:0}

/* ---------- componentes ---------- */
.ss-btn{
  display:inline-flex;align-items:center;gap:.6em;justify-content:center;
  font:inherit;font-size:clamp(16px,1.5vw,22px);font-weight:650;
  padding:.72em 1.4em;border-radius:10px;border:1px solid transparent;
  text-decoration:none;cursor:pointer;width:fit-content;
  transition:transform var(--ss-t,140ms) ease,box-shadow var(--ss-t,140ms) ease;
}
.ss-btn:hover{transform:translateY(-1px)}
.ss-btn-primary{background:var(--ss-accent);color:#171003}
.ss-btn-ghost{background:transparent;color:var(--ss-ink);border-color:var(--ss-line)}
.ss-btn-row{display:flex;flex-wrap:wrap;gap:12px}
.ss-card{
  background:var(--ss-surface);border:1px solid var(--ss-line);
  border-radius:14px;padding:clamp(16px,1.8vw,26px);
  display:flex;flex-direction:column;gap:10px;
}
.ss-card .ss-h3{color:var(--ss-ink)}
.ss-card p{font-size:clamp(15px,1.35vw,20px)}
.ss-rule{height:3px;width:64px;background:var(--ss-accent);border:0;margin:0;border-radius:2px}
.ss-table{width:100%;border-collapse:collapse;font-size:clamp(15px,1.4vw,21px)}
.ss-table th,.ss-table td{text-align:left;padding:.6em .8em;border-bottom:1px solid var(--ss-line)}
.ss-table th{color:var(--ss-muted);font-weight:600}
.ss-img{border-radius:14px;width:100%;height:auto;display:block}
.ss-mono{font-family:var(--ss-mono)}

/* ---------- hud do deck ---------- */
.ss-hud{
  position:fixed;left:0;right:0;bottom:0;z-index:40;pointer-events:none;
  font-family:var(--ss-font);
}
.ss-progress{height:3px;background:rgb(255 255 255 / .12)}
.ss-progress span{display:block;height:100%;width:0;background:var(--ss-accent);transition:width 240ms ease}
.ss-hud-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px clamp(16px,2.4vw,32px);font-size:13px;color:var(--ss-muted);
}
.ss-hud b{color:var(--ss-ink);font-weight:650}

/* ---------- transições entre slides ---------- */
/* ---------- transicoes entre slides ---------- */
@keyframes ss-fade{from{opacity:var(--ss-t-op,0)}to{opacity:1}}
@keyframes ss-slide-left{from{opacity:var(--ss-t-op,0);transform:translateX(var(--ss-t-dist,48px))}to{opacity:1;transform:none}}
@keyframes ss-slide-right{from{opacity:var(--ss-t-op,0);transform:translateX(calc(-1 * var(--ss-t-dist,48px)))}to{opacity:1;transform:none}}
@keyframes ss-slide-up{from{opacity:var(--ss-t-op,0);transform:translateY(var(--ss-t-dist,48px))}to{opacity:1;transform:none}}
@keyframes ss-slide-down{from{opacity:var(--ss-t-op,0);transform:translateY(calc(-1 * var(--ss-t-dist,48px)))}to{opacity:1;transform:none}}
@keyframes ss-zoom-in{from{opacity:var(--ss-t-op,0);transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes ss-zoom-out{from{opacity:var(--ss-t-op,0);transform:scale(1.12)}to{opacity:1;transform:none}}
@keyframes ss-flip{from{opacity:var(--ss-t-op,0);transform:perspective(1200px) rotateY(14deg)}to{opacity:1;transform:none}}
@keyframes ss-rotate{from{opacity:var(--ss-t-op,0);transform:rotate(-4deg) scale(.97)}to{opacity:1;transform:none}}
@keyframes ss-wipe{from{clip-path:inset(0 0 0 100%)}to{clip-path:inset(0 0 0 0)}}
@keyframes ss-blur-in{from{opacity:var(--ss-t-op,0);filter:blur(12px)}to{opacity:1;filter:none}}
.ss-slide[data-transition="fade"]{--ss-t-enter:ss-fade}
.ss-slide[data-transition="slide"]{--ss-t-enter:ss-slide-left}
.ss-slide[data-transition="slide-back"]{--ss-t-enter:ss-slide-right}
.ss-slide[data-transition="slide-up"]{--ss-t-enter:ss-slide-up}
.ss-slide[data-transition="slide-down"]{--ss-t-enter:ss-slide-down}
.ss-slide[data-transition="zoom-in"]{--ss-t-enter:ss-zoom-in}
.ss-slide[data-transition="zoom-out"]{--ss-t-enter:ss-zoom-out}
.ss-slide[data-transition="flip"]{--ss-t-enter:ss-flip}
.ss-slide[data-transition="rotate"]{--ss-t-enter:ss-rotate}
.ss-slide[data-transition="wipe"]{--ss-t-enter:ss-wipe}
.ss-slide[data-transition="blur"]{--ss-t-enter:ss-blur-in}
.ss-slide[data-transition="none"]{--ss-t-enter:ss-fade;--ss-t-dur:1ms;--ss-t-op:1}
.ss-slide.is-active{animation:var(--ss-t-enter,ss-fade) var(--ss-t-dur,380ms) both ease}

/* ---------- animações de entrada por elemento ---------- */
@keyframes ss-a-fade{from{opacity:0}to{opacity:1}}
@keyframes ss-a-fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
@keyframes ss-a-fade-down{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:none}}
@keyframes ss-a-fade-left{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes ss-a-fade-right{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes ss-a-zoom{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes ss-a-blur{from{opacity:0;filter:blur(10px)}to{opacity:1;filter:none}}
@keyframes ss-a-rise{from{opacity:0;transform:translateY(54px)}to{opacity:1;transform:none}}
.ss-slide.is-active [data-anim]{animation:var(--ss-a,ss-a-fade-up) var(--ss-anim-dur,620ms) both var(--ss-anim-delay,0ms) cubic-bezier(.2,.7,.3,1)}
.ss-slide.is-active [data-anim="fade"]{--ss-a:ss-a-fade}
.ss-slide.is-active [data-anim="fade-up"]{--ss-a:ss-a-fade-up}
.ss-slide.is-active [data-anim="fade-down"]{--ss-a:ss-a-fade-down}
.ss-slide.is-active [data-anim="fade-left"]{--ss-a:ss-a-fade-left}
.ss-slide.is-active [data-anim="fade-right"]{--ss-a:ss-a-fade-right}
.ss-slide.is-active [data-anim="zoom"]{--ss-a:ss-a-zoom}
.ss-slide.is-active [data-anim="blur"]{--ss-a:ss-a-blur}
.ss-slide.is-active [data-anim="rise"]{--ss-a:ss-a-rise}

/* ---------- telefone ---------- */
@media (max-width:640px){
  .ss-slide{padding:clamp(20px,6vw,32px)}
  .ss-content[data-layout="split"]{grid-template-columns:1fr}
  .ss-content[data-layout="cards"] .ss-cards{grid-template-columns:1fr}
}

/* ---------- movimento reduzido ---------- */
@media (prefers-reduced-motion:reduce){
  .ss-slide.is-active,.ss-slide.is-active [data-anim]{animation-duration:1ms !important;animation-delay:0ms !important}
  .ss-btn:hover{transform:none}
}

/* ---------- imprimir / PDF ---------- */
@media print{
  body.ss-deck{overflow:visible;background:#fff;color:#000}
  .ss-stage{position:static;display:block}
  .ss-slide,.ss-slide.is-active{
    display:grid !important;position:relative;inset:auto;
    min-height:auto;height:auto;page-break-after:always;break-after:page;
    animation:none !important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
    background:var(--slide-bg,var(--ss-bg)) !important;
    color:var(--slide-ink,var(--ss-ink)) !important;
  }
  .ss-slide.is-active [data-anim]{animation:none !important;opacity:1 !important;transform:none !important;filter:none !important}
  .ss-hud{display:none !important}
  .ss-editor,#ss-editor-style,#ss-editor-script,base{display:none !important}
  .ss-content{display:flex;flex-direction:column;gap:clamp(12px,1.6vw,22px);max-width:none;padding:0}
  .ss-slide[data-transition]{--ss-t-enter:none}
  img{page-break-inside:avoid;max-width:100%;height:auto}
  .ss-media{object-fit:cover}
  /* Garante que caixas absolutas no slide impresso não vazem */
  .ss-slide>*{max-width:100%;overflow:visible}
}
`
