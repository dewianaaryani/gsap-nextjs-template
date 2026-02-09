"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/all";

gsap.registerPlugin(ScrollTrigger, Draggable);

export default function ArtistCards() {
  const galleryRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        let iteration = 0;

        const cards = gsap.utils.toArray<HTMLLIElement>(
          cardsRef.current!.children,
        );

        // Initial state
        gsap.set(cards, {
          xPercent: 400,
          opacity: 0,
          scale: 0,
        });

        const spacing = 0.1;
        const snapTime = gsap.utils.snap(spacing);

        const animateCard = (el: HTMLElement) => {
          const tl = gsap.timeline();

          tl.fromTo(
            el,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              zIndex: 100,
              duration: 0.5,
              yoyo: true,
              repeat: 1,
              ease: "power1.in",
            },
          ).fromTo(
            el,
            { xPercent: 400 },
            {
              xPercent: -400,
              duration: 1,
              ease: "none",
            },
            0,
          );

          return tl;
        };

        const seamlessLoop = buildSeamlessLoop(cards, spacing, animateCard);

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

        const trigger = ScrollTrigger.create({
          trigger: galleryRef.current,
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

        const progressToScroll = (progress: number) =>
          gsap.utils.clamp(
            1,
            trigger.end - 1,
            gsap.utils.wrap(0, 1, progress) * trigger.end,
          );

        function wrap(delta: number, scrollTo: number) {
          iteration += delta;
          trigger.scroll(scrollTo);
          trigger.update();
        }

        function scrollToOffset(offset: number) {
          const snapped = snapTime(offset);

          const progress =
            (snapped - seamlessLoop.duration() * iteration) /
            seamlessLoop.duration();

          const scroll = progressToScroll(progress);

          if (progress >= 1 || progress < 0) {
            wrap(Math.floor(progress), scroll);
            return;
          }

          trigger.scroll(scroll);
        }

        // Buttons
        nextRef.current?.addEventListener("click", () => {
          scrollToOffset(scrub.vars.offset + spacing);
        });

        prevRef.current?.addEventListener("click", () => {
          scrollToOffset(scrub.vars.offset - spacing);
        });

        // Draggable
        Draggable.create(proxyRef.current!, {
          type: "x",
          trigger: cardsRef.current,

          onPress() {
            this.startOffset = scrub.vars.offset;
          },

          onDrag() {
            scrub.vars.offset =
              this.startOffset + (this.startX - this.x) * 0.001;

            scrub.invalidate().restart();
          },

          onDragEnd() {
            scrollToOffset(scrub.vars.offset);
          },
        });

        ScrollTrigger.addEventListener("scrollEnd", () => {
          scrollToOffset(scrub.vars.offset);
        });

        // Build loop
        function buildSeamlessLoop(
          items: HTMLElement[],
          spacing: number,
          animate: (el: HTMLElement) => gsap.core.Timeline,
        ) {
          const overlap = Math.ceil(1 / spacing);

          const startTime = items.length * spacing + 0.5;

          const loopTime = (items.length + overlap) * spacing + 1;

          const raw = gsap.timeline({ paused: true });

          const loop = gsap.timeline({
            paused: true,
            repeat: -1,
          });

          const total = items.length + overlap * 2;

          for (let i = 0; i < total; i++) {
            const index = i % items.length;
            const time = i * spacing;

            raw.add(animate(items[index]), time);

            if (i <= items.length) {
              loop.add("label" + i, time);
            }
          }

          raw.time(startTime);

          loop
            .to(raw, {
              time: loopTime,
              duration: loopTime - startTime,
              ease: "none",
            })
            .fromTo(
              raw,
              {
                time: overlap * spacing + 1,
              },
              {
                time: startTime,
                duration: startTime - (overlap * spacing + 1),
                ease: "none",
                immediateRender: false,
              },
            );

          return loop;
        }
      }, galleryRef);

      return () => ctx.revert();
    },
    { scope: galleryRef },
  );

  const images = [
    "https://assets.codepen.io/16327/portrait-number-01.png",
    "https://assets.codepen.io/16327/portrait-number-02.png",
    "https://assets.codepen.io/16327/portrait-number-03.png",
    "https://assets.codepen.io/16327/portrait-number-04.png",
    "https://assets.codepen.io/16327/portrait-number-05.png",
    "https://assets.codepen.io/16327/portrait-number-06.png",
    "https://assets.codepen.io/16327/portrait-number-07.png",
  ];

  return (
    <div
      ref={galleryRef}
      className="gallery relative w-full h-screen overflow-hidden bg-gray-900"
    >
      <ul
        ref={cardsRef}
        className="cards absolute w-56 h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {images.map((src, i) => (
          <li
            key={i}
            className="absolute w-56 aspect-[9/16] bg-contain bg-no-repeat bg-center rounded-lg"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </ul>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
        <button
          ref={prevRef}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Prev
        </button>

        <button
          ref={nextRef}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Next
        </button>
      </div>

      <div ref={proxyRef} className="drag-proxy invisible absolute" />
    </div>
  );
}
