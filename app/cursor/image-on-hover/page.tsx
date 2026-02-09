"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React from "react";

export default function page() {
  const containerRef = React.useRef<HTMLLIElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  useGSAP(
    () => {
      const container = containerRef.current;
      const image = imageRef.current;

      if (!container || !image) return;

      // Center image on cursor
      gsap.set(image, {
        xPercent: -50,
        yPercent: -50,
      });

      let firstEnter = true;

      // Smooth movement
      const setX = gsap.quickTo(image, "x", {
        duration: 0.4,
        ease: "power3",
      });

      const setY = gsap.quickTo(image, "y", {
        duration: 0.4,
        ease: "power3",
      });

      // Follow cursor
      const align = (e: MouseEvent) => {
        if (firstEnter) {
          setX(e.clientX, e.clientX);
          setY(e.clientY, e.clientY);
          firstEnter = false;
        } else {
          setX(e.clientX);
          setY(e.clientY);
        }
      };

      const startFollow = () => {
        document.addEventListener("mousemove", align);
      };

      const stopFollow = () => {
        document.removeEventListener("mousemove", align);
      };

      // Fade animation
      const fade = gsap.to(image, {
        autoAlpha: 1,
        paused: true,
        duration: 0.15,
        onReverseComplete: stopFollow,
      });

      // Handlers
      const onEnter = (e: MouseEvent) => {
        firstEnter = true;
        fade.play();
        startFollow();
        align(e);
      };

      const onLeave = () => {
        fade.reverse();
      };

      container.addEventListener("mouseenter", onEnter);
      container.addEventListener("mouseleave", onLeave);

      // Cleanup (handled by GSAP Context)
      return () => {
        container.removeEventListener("mouseenter", onEnter);
        container.removeEventListener("mouseleave", onLeave);
        stopFollow();
        fade.kill();
      };
    },
    {
      scope: containerRef, // 👈 important
    },
  );

  return (
    <div className="w-screen h-full">
      <ul role="list" className="w-screen m-0 p-0">
        <li
          className="container inline-block border-b-2 border-black w-full p-4"
          ref={containerRef}
        >
          <img
            className="swipeimage fixed top-0 left-0 w-xs h-fit object-cover -translate-y-1/2 -translate-x-1/2 transform z-10 opacity-0 pointer-events-none"
            src="https://assets.codepen.io/16327/portrait-image-8.jpg"
            ref={imageRef}
          />
          <div className="text">
            <h3>restart reverse scrub pin markers overwrite modifiers</h3>
          </div>
        </li>
        {/* <li className="container">
          <img
            className="swipeimage"
            src="https://assets.codepen.io/16327/portrait-image-3.jpg"
          />
          <div className="text">
            <h3>toggleActions start end once refresh from to</h3>
          </div>
        </li>
        <li className="container">
          <img
            className="swipeimage"
            src="https://assets.codepen.io/16327/portrait-image-1.jpg"
          />
          <div className="text">
            <h3>ScrollSmoother Flip Draggable SplitText InertiaPlugin</h3>
          </div>
        </li>
        <li className="container">
          <img
            className="swipeimage"
            src="https://assets.codepen.io/16327/portrait-image-14.jpg"
          />
          <div className="text">
            <h3>onComplete onUpdate quickSetter quickTo utils.toArray.</h3>
          </div>
        </li>
        <li className="container">
          <img
            className="swipeimage"
            src="https://assets.codepen.io/16327/portrait-image-6.jpg"
          />
          <div className="text">
            <h3>Power2 Power3 Power4 Back Elastic Bounce Expo Sine</h3>
          </div>
        </li> */}
      </ul>
    </div>
  );
}
