const ITEMS = [
  { title: "Paper preprint out!", text: "Learning control with topo priors.", href: "#" },
  { title: "New project log", text: "Quadruped gait experiments v2.", href: "#" },
  { title: "Talk uploaded", text: "RL for geometric planning.", href: "#" },
  { title: "Release", text: "Linear Transform Playground v1.1.", href: "#" },
];

const root = document.getElementById("newsCarousel");
let idx = 0, busy = false;

function card(mark) {
  const el = document.createElement("article");
  el.className = `news-card ${mark}`;
  el.innerHTML = `
    <h3></h3>
    <p></p>
    <a target="_blank" rel="noopener">Read more →</a>`;
  return el;
}
function fill(el, item){
  el.querySelector("h3").textContent = item.title;
  el.querySelector("p").textContent  = item.text;
  el.querySelector("a").href = item.href;
}

// initial 3 cards
const L = card("left"), C = card("center"), R = card("right");
root.append(L, C, R);
function setTriple(i){
  fill(L, ITEMS[(i-1+ITEMS.length)%ITEMS.length]);
  fill(C, ITEMS[i%ITEMS.length]);
  fill(R, ITEMS[(i+1)%ITEMS.length]);
}
setTriple(idx);

function next(){
  if (busy) return; busy = true;

  // animate out/in
  L.className = "news-card off-left";
  C.className = "news-card left";
  R.className = "news-card center";

  // when the center transition ends, recycle L to the right and update content
  R.addEventListener("transitionend", function onEnd(e){
    if (e.propertyName !== "transform") return;
    R.removeEventListener("transitionend", onEnd);

    // recycle the old left card to become the new right card
    idx = (idx + 1) % ITEMS.length;
    fill(L, ITEMS[(idx + 1) % ITEMS.length]);
    L.className = "news-card off-right";

    // allow layout to apply, then slide it in to 'right'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        L.className = "news-card right";
        // swap refs so L,C,R labels stay consistent
        const tmpL = L; L = C; C = R; R = tmpL;
        busy = false;
      });
    });
  }, { once:true });
}

function prev(){
  if (busy) return; busy = true;

  R.className = "news-card off-right";
  C.className = "news-card right";
  L.className = "news-card center";

  L.addEventListener("transitionend", function onEnd(e){
    if (e.propertyName !== "transform") return;
    L.removeEventListener("transitionend", onEnd);

    idx = (idx - 1 + ITEMS.length) % ITEMS.length;
    fill(R, ITEMS[(idx - 1 + ITEMS.length) % ITEMS.length]);
    R.className = "news-card off-left";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        R.className = "news-card left";
        const tmpR = R; R = C; C = L; L = tmpR;
        busy = false;
      });
    });
  }, { once:true });
}

// click/keys
root.addEventListener("click", next);
root.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" || e.key === " ") next();
  if (e.key === "ArrowLeft") prev();
});