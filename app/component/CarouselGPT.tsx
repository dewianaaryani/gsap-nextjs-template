"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger, Draggable } from "gsap/all";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, Draggable);

export default function CardGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      let iteration = 0;

      const cards = gsap.utils.toArray<HTMLLIElement>(
        cardsRef.current!.querySelectorAll("li"),
      );

      // Initial state
      gsap.set(cards, {
        xPercent: 400,
        opacity: 0,
        scale: 0,
      });

      const spacing = 0.1;
      const snapTime = gsap.utils.snap(spacing);

      /* --------------------------------
         Card animation
      ---------------------------------*/
      const animateFunc = (el: HTMLElement) => {
        const tl = gsap.timeline();

        tl.fromTo(
          el,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            zIndex: 100,
            duration: 0.5,
            repeat: 1,
            yoyo: true,
            ease: "power1.in",
            immediateRender: false,
          },
        ).fromTo(
          el,
          { xPercent: 400 },
          {
            xPercent: -400,
            duration: 1,
            ease: "none",
            immediateRender: false,
          },
          0,
        );

        return tl;
      };

      /* --------------------------------
         Build loop
      ---------------------------------*/
      const seamlessLoop = buildSeamlessLoop(cards, spacing, animateFunc);

      const playhead = { offset: 0 };

      const wrapTime = gsap.utils.wrap(0, seamlessLoop.duration());

      const scrub = gsap.to(playhead, {
        offset: 0,
        duration: 0.5,
        ease: "power3",
        paused: true,
        onUpdate() {
          seamlessLoop.time(wrapTime(playhead.offset));
        },
      });

      /* --------------------------------
         ScrollTrigger
      ---------------------------------*/
      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "+=3000",
        pin: true,

        onUpdate(self) {
          const scroll = self.scroll();

          if (scroll > self.end - 1) {
            wrap(1, 2);
          } else if (scroll < 1 && self.direction < 0) {
            wrap(-1, self.end - 2);
          } else {
            scrub.vars.offset =
              (iteration + self.progress) * seamlessLoop.duration();

            scrub.invalidate().restart();
          }
        },
      });

      /* --------------------------------
         Helpers
      ---------------------------------*/
      const progressToScroll = (progress: number) =>
        gsap.utils.clamp(
          1,
          trigger.end - 1,
          gsap.utils.wrap(0, 1, progress) * trigger.end,
        );

      const wrap = (iterationDelta: number, scrollTo: number) => {
        iteration += iterationDelta;
        trigger.scroll(scrollTo);
        trigger.update();
      };

      function scrollToOffset(offset: number) {
        const snapped = snapTime(offset);

        const progress =
          (snapped - seamlessLoop.duration() * iteration) /
          seamlessLoop.duration();

        const scroll = progressToScroll(progress);

        if (progress >= 1 || progress < 0) {
          return wrap(Math.floor(progress), scroll);
        }

        trigger.scroll(scroll);
      }

      /* --------------------------------
         Buttons
      ---------------------------------*/
      nextRef.current?.addEventListener("click", () => {
        scrollToOffset(scrub.vars.offset + spacing);
      });

      prevRef.current?.addEventListener("click", () => {
        scrollToOffset(scrub.vars.offset - spacing);
      });

      /* --------------------------------
         Drag
      ---------------------------------*/
      Draggable.create(proxyRef.current!, {
        type: "x",
        trigger: cardsRef.current,

        onPress() {
          // @ts-ignore
          this.startOffset = scrub.vars.offset;
        },

        onDrag() {
          // @ts-ignore
          scrub.vars.offset = this.startOffset + (this.startX - this.x) * 0.001;

          scrub.invalidate().restart();
        },

        onDragEnd() {
          scrollToOffset(scrub.vars.offset);
        },
      });

      /* --------------------------------
         Scroll end snap
      ---------------------------------*/
      ScrollTrigger.addEventListener("scrollEnd", () => {
        scrollToOffset(scrub.vars.offset);
      });

      /* --------------------------------
         Cleanup
      ---------------------------------*/
      return () => {
        ScrollTrigger.killAll();
        Draggable.get(proxyRef.current!)?.kill();
      };
    },
    {
      scope: containerRef,
    },
  );

  return (
    <section ref={containerRef} className="gallery relative h-screen">
      <ul ref={cardsRef} className="cards flex gap-6">
        {[...Array(8)].map((_, i) => (
          <li
            key={i}
            className="w-64 h-80 bg-neutral-800 rounded-xl flex items-center justify-center text-white text-2xl"
          >
            Card {i + 1}
          </li>
        ))}
      </ul>

      {/* Drag proxy */}
      <div ref={proxyRef} className="drag-proxy fixed inset-0" />

      {/* Controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
        <button ref={prevRef} className="px-4 py-2 bg-white text-black">
          Prev
        </button>

        <button ref={nextRef} className="px-4 py-2 bg-white text-black">
          Next
        </button>
      </div>
    </section>
  );
}

/* --------------------------------
   Loop Builder
---------------------------------*/

function buildSeamlessLoop(
  items: HTMLElement[],
  spacing: number,
  animateFunc: (el: HTMLElement) => gsap.core.Timeline,
) {
  const overlap = Math.ceil(1 / spacing);
  const startTime = items.length * spacing + 0.5;
  const loopTime = (items.length + overlap) * spacing + 1;

  const rawSequence = gsap.timeline({ paused: true });

  const seamlessLoop = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat() {
      // @ts-ignore
      this._time === this._dur && (this._tTime += this._dur - 0.01);
    },
  });

  const l = items.length + overlap * 2;

  for (let i = 0; i < l; i++) {
    const index = i % items.length;
    const time = i * spacing;

    rawSequence.add(animateFunc(items[index]), time);

    if (i <= items.length) {
      seamlessLoop.add("label" + i, time);
    }
  }

  rawSequence.time(startTime);

  seamlessLoop
    .to(rawSequence, {
      time: loopTime,
      duration: loopTime - startTime,
      ease: "none",
    })
    .fromTo(
      rawSequence,
      { time: overlap * spacing + 1 },
      {
        time: startTime,
        duration: startTime - (overlap * spacing + 1),
        ease: "none",
        immediateRender: false,
      },
    );

  return seamlessLoop;
}
