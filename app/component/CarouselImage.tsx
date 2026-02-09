"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/all";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, Draggable);

const ArtistCards = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    let iteration = 0; // gets iterated when we scroll all the way to the end or start and wraps around - allows us to smoothly continue the playhead scrubbing in the correct direction.

    // set initial state of items
    gsap.set(".cards li", { xPercent: 400, opacity: 0, scale: 0 });

    const spacing = 0.1, // spacing of the cards (stagger)
      snapTime = gsap.utils.snap(spacing), // we'll use this to snapTime the playhead on the seamlessLoop
      cards = gsap.utils.toArray(".cards li") as HTMLElement[],
      // this function will get called for each element in the buildSeamlessLoop() function, and we just need to return an animation that'll get inserted into a master timeline, spaced
      animateFunc = (element: HTMLElement) => {
        const tl = gsap.timeline();
        tl.fromTo(
          element,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            zIndex: 100,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "power1.in",
            immediateRender: false,
          },
        ).fromTo(
          element,
          { xPercent: 400 },
          { xPercent: -400, duration: 1, ease: "none", immediateRender: false },
          0,
        );
        return tl;
      },
      seamlessLoop = buildSeamlessLoop(cards, spacing, animateFunc),
      playhead = { offset: 0 }, // a proxy object we use to simulate the playhead position, but it can go infinitely in either direction and we'll just use an onUpdate to convert it to the corresponding time on the seamlessLoop timeline.
      wrapTime = gsap.utils.wrap(0, seamlessLoop.duration()), // feed in any offset (time) and it'll return the corresponding wrapped time (a safe value between 0 and the seamlessLoop's duration)
      scrub = gsap.to(playhead, {
        // we reuse this tween to smoothly scrub the playhead on the seamlessLoop
        offset: 0,
        onUpdate() {
          seamlessLoop.time(wrapTime(playhead.offset)); // convert the offset to a "safe" corresponding time on the seamlessLoop timeline
        },
        duration: 0.5,
        ease: "power3",
        paused: true,
      }),
      trigger = ScrollTrigger.create({
        start: 0,
        onUpdate(self) {
          let scroll = self.scroll();
          if (scroll > self.end - 1) {
            wrap(1, 2);
          } else if (scroll < 1 && self.direction < 0) {
            wrap(-1, self.end - 2);
          } else {
            scrub.vars.offset =
              (iteration + self.progress) * seamlessLoop.duration();
            scrub.invalidate().restart(); // to improve performance, we just invalidate and restart the same tween. No need for overwrites or creating a new tween on each update.
          }
        },
        end: "+=3000",
        pin: ".gallery",
      }),
      // converts a progress value (0-1, but could go outside those bounds when wrapping) into a "safe" scroll value that's at least 1 away from the start or end because we reserve those for sensing when the user scrolls ALL the way up or down, to wrap.
      progressToScroll = (progress: number) =>
        gsap.utils.clamp(
          1,
          trigger.end - 1,
          gsap.utils.wrap(0, 1, progress) * trigger.end,
        ),
      wrap = (iterationDelta: number, scrollTo: number) => {
        iteration += iterationDelta;
        trigger.scroll(scrollTo);
        trigger.update(); // by default, when we trigger.scroll(), it waits 1 tick to update().
      };

    // when the user stops scrolling, snap to the closest item.
    ScrollTrigger.addEventListener("scrollEnd", () =>
      scrollToOffset(scrub.vars.offset),
    );

    // feed in an offset (like a time on the seamlessLoop timeline, but it can exceed 0 and duration() in either direction; it'll wrap) and it'll set the scroll position accordingly. That'll call the onUpdate() on the trigger if there's a change.
    function scrollToOffset(offset: number) {
      // moves the scroll playhead to the place that corresponds to the totalTime value of the seamlessLoop, and wraps if necessary.
      let snappedTime = snapTime(offset),
        progress =
          (snappedTime - seamlessLoop.duration() * iteration) /
          seamlessLoop.duration(),
        scroll = progressToScroll(progress);
      if (progress >= 1 || progress < 0) {
        return wrap(Math.floor(progress), scroll);
      }
      trigger.scroll(scroll);
    }

    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".prev");
    nextBtn?.addEventListener("click", () =>
      scrollToOffset(scrub.vars.offset + spacing),
    );
    prevBtn?.addEventListener("click", () =>
      scrollToOffset(scrub.vars.offset - spacing),
    );

    // below is the dragging functionality (mobile-friendly too)...
    Draggable.create(".drag-proxy", {
      type: "x",
      trigger: ".cards",
      onPress() {
        this.startOffset = scrub.vars.offset;
      },
      onDrag() {
        scrub.vars.offset = this.startOffset + (this.startX - this.x) * 0.001;
        scrub.invalidate().restart(); // same thing as we do in the ScrollTrigger's onUpdate
      },
      onDragEnd() {
        scrollToOffset(scrub.vars.offset);
      },
    });

    function buildSeamlessLoop(
      items: HTMLElement[],
      spacing: number,
      animateFunc: (element: HTMLElement) => gsap.core.Timeline,
    ) {
      let overlap = Math.ceil(1 / spacing), // number of EXTRA animations on either side of the start/end to accommodate the seamless looping
        startTime = items.length * spacing + 0.5, // the time on the rawSequence at which we'll start the seamless loop
        loopTime = (items.length + overlap) * spacing + 1, // the spot at the end where we loop back to the startTime
        rawSequence = gsap.timeline({ paused: true }), // this is where all the "real" animations live
        seamlessLoop = gsap.timeline({
          // this merely scrubs the playhead of the rawSequence so that it appears to seamlessly loop
          paused: true,
          repeat: -1, // to accommodate infinite scrolling/looping
          onRepeat() {
            // works around a super rare edge case bug that's fixed GSAP 3.6.1
            this._time === this._dur && (this._tTime += this._dur - 0.01);
          },
        }),
        l = items.length + overlap * 2,
        time: number,
        i: number,
        index: number;

      // now loop through and create all the animations in a staggered fashion. Remember, we must create EXTRA animations at the end to accommodate the seamless looping.
      for (i = 0; i < l; i++) {
        index = i % items.length;
        time = i * spacing;
        rawSequence.add(animateFunc(items[index]), time);
        i <= items.length && seamlessLoop.add("label" + i, time); // we don't really need these, but if you wanted to jump to key spots using labels, here ya go.
      }

      // here's where we set up the scrubbing of the playhead to make it appear seamless.
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
            immediateRender: false,
            ease: "none",
          },
        );
      return seamlessLoop;
    }

    // Cleanup on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      // Kill Draggable instances on the drag-proxy element
      const draggables = Draggable.get(".drag-proxy") as unknown as any[];
      if (draggables && draggables.length > 0) {
        draggables.forEach((d: any) => d.kill());
      }
    };
  }, []);

  const images = [
    "https://assets.codepen.io/16327/portrait-number-01.png",
    "https://assets.codepen.io/16327/portrait-number-02.png",
    "https://assets.codepen.io/16327/portrait-number-03.png",
    "https://assets.codepen.io/16327/portrait-number-04.png",
    "https://assets.codepen.io/16327/portrait-number-05.png",
    "https://assets.codepen.io/16327/portrait-number-06.png",
    "https://assets.codepen.io/16327/portrait-number-07.png",
    "https://assets.codepen.io/16327/portrait-number-01.png",
    "https://assets.codepen.io/16327/portrait-number-02.png",
    "https://assets.codepen.io/16327/portrait-number-03.png",
    "https://assets.codepen.io/16327/portrait-number-04.png",
    "https://assets.codepen.io/16327/portrait-number-05.png",
    "https://assets.codepen.io/16327/portrait-number-06.png",
    "https://assets.codepen.io/16327/portrait-number-07.png",
  ];

  return (
    <div className="gallery absolute w-full h-screen overflow-hidden bg-gray-900">
      <ul className="cards absolute w-56 h-72 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {images.map((src, index) => (
          <li
            key={index}
            className="list-none p-0 m-0 w-56 aspect-9/16 text-center leading-72 text-2xl absolute bg-contain bg-no-repeat bg-center top-0 left-0 rounded-lg"
            style={{ backgroundImage: `url(${src})` }}
          ></li>
        ))}
      </ul>
      <div className="actions absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-4">
        <button className="prev px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Prev
        </button>
        <button className="next px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Next
        </button>
      </div>
      <div className="drag-proxy invisible absolute" ref={proxyRef}></div>
    </div>
  );
};

export default ArtistCards;
