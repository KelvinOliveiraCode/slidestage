// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseDeck, setSlideAttrs } from "./doc";
import { buildDeckHtml, buildStarterDeck } from "./buildDoc";
import { slide, h1, p } from "./snippets";

describe("notas do apresentador", () => {
  it("guarda a nota em atributo e nao como texto visivel do slide", () => {
    const s = slide([h1("Titulo"), p("Corpo")], { layout: "title", notes: "SEGREDO" });
    expect(s).toContain('data-notes="SEGREDO"');
    const soTexto = s.replace(/<[^>]+>/g, "");
    expect(soTexto).not.toContain("SEGREDO");
  });

  it("sobe e desce pelo meta lido pelo app", () => {
    const base = buildDeckHtml({ title: "T", slides: [slide([h1("A")], { layout: "title" })] });
    const id = parseDeck(base).slides[0].id;
    const comNota = setSlideAttrs(base, id, { notes: "FALA1" });
    expect(parseDeck(comNota).slides[0].notes).toBe("FALA1");
    const semNota = setSlideAttrs(comNota, id, { notes: "" });
    expect(parseDeck(semNota).slides[0].notes).toBe("");
  });

  it("nota nao altera o titulo/rotulo do slide no trilho", () => {
    const base = buildDeckHtml({ title: "T", slides: [slide([h1("Titulo Real")], { layout: "title" })] });
    const id = parseDeck(base).slides[0].id;
    const comNota = setSlideAttrs(base, id, { notes: "texto longo da nota" });
    expect(parseDeck(comNota).slides[0].title).toBe("Titulo Real");
  });

  it("sobrevive ao deck inicial e ao parse", () => {
    const deck = parseDeck(buildStarterDeck());
    expect(deck.slides.length).toBeGreaterThan(0);
    expect(typeof deck.slides[0].notes).toBe("string");
  });

  it("escapa aspas na nota para nao quebrar o HTML", () => {
    const s = slide([h1("A")], { layout: "title", notes: 'aspas " e <script>' });
    expect(s).not.toContain("<script>");
  });
});
