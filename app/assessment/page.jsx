"use client";

import React, { useEffect, useState } from "react";
import questionsData from "@/data/questions.json";
import {
   DndContext,
   DragOverlay,
   MouseSensor,
   TouchSensor,
   useDraggable,
   useDroppable,
   useSensor,
   useSensors,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const saveAssessmentToFirebase = async (data) => {
   console.log("🔥 saveAssessmentToFirebase START");

   try {
      console.log("🔥 Before addDoc");

      const ref = await addDoc(collection(db, "assessments"), {
         ...data,
         createdAt: serverTimestamp(),
      });

      console.log("✅ Saved with ID:", ref.id);
   } catch (error) {
      console.error("❌ Firebase error:", error);
      throw error;
   } finally {
      console.log("🔥 saveAssessmentToFirebase END");
   }
};



/* ---------- UI COMPONENTS ---------- */

function Box({ dragging, color }) {
   return (
      <div
         style={{
            backgroundColor: color,
            opacity: dragging ? 0.7 : 1,
         }}
         className="md:w-36 md:h-36 sm:w-24 sm:h-24 w-16 h-16 rounded-xl shadow-md select-none transition"
      />
   );
}

function DraggableBox({ id, color }) {
   const { setNodeRef, listeners, attributes } = useDraggable({ id });

   return (
      <div
         ref={setNodeRef}
         {...listeners}
         {...attributes}
         className="cursor-move flex items-center justify-center"
      >
         <Box color={color} dragging={false} />
      </div>
   );
}

function DroppableBox({ id, children }) {
   const { setNodeRef, isOver } = useDroppable({ id });

   return (
      <div
         ref={setNodeRef}
         className={`w-full sm:h-32 md:h-44 h-20 rounded-xl flex items-center justify-center
        border-2 transition
        ${isOver ? "border-blue-500" : "border-white"}
      `}
      >
         {children}
      </div>
   );
}

/* ---------- HELPERS ---------- */

function shuffleArray(arr) {
   const copy = [...arr];
   for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
   }
   return copy;
}

// Generates 4 HSL colors with:
// - fixed random hue
// - rich saturation
// - lightness spread with min gap 10
const generateColorPalette = () => {
   // 1. Random hue (0–360)
   const hue = Math.floor(Math.random() * 360);

   // 2. Controlled saturation (keeps colors rich)
   const saturation = 60 + Math.random() * 15; // 60–75%

   // 3. SAFE lightness range (no pure black, no pure white, not flat grey)
   const MIN_L = 20;
   const MAX_L = 75;
   const GAP = 10;

   // Need span for 4 shades: 3 gaps of 10 => 30
   const maxStart = MAX_L - GAP * 3; // 75 - 30 = 45
   const start =
      MIN_L + Math.floor(Math.random() * (maxStart - MIN_L + 1));

   const lightnessValues = [
      start,
      start + GAP,
      start + GAP * 2,
      start + GAP * 3,
   ];

   const shades = lightnessValues.map(
      (lightness) => `hsl(${hue}, ${saturation}%, ${lightness}%)`
   );

   return shades;
};

// Turn shades into objects with id + lightness for comparison
const generateColorObjects = (count) => {
   const shades = generateColorPalette().slice(0, count);

   const items = shades.map((color, index) => {
      const lightnessMatch = color.match(/(\d+)%\)$/);
      const lightness = lightnessMatch ? Number(lightnessMatch[1]) : 0;

      return {
         id: `color-${index}`,
         color,
         lightness,
      };
   });

   // Important: shuffle so they DON'T appear already sorted
   return shuffleArray(items);
};

// Given a list of color objects + direction, return the correct order
const getCorrectOrderFromArray = (items, direction) => {
   if (direction === "dark-to-light") {
      // darkest first → lowest lightness first
      return [...items].sort((a, b) => a.lightness - b.lightness);
   }
   // default: light-to-dark → highest lightness first
   return [...items].sort((a, b) => b.lightness - a.lightness);
};

/* ---------- MAIN COMPONENT ---------- */

export default function Assessment() {
   const totalQuestions = questionsData.length;
   const [currentIndex, setCurrentIndex] = useState(0);
   const [answers, setAnswers] = useState({});
   const [activeId, setActiveId] = useState(null);
   const [mounted, setMounted] = useState(false);
   const [submit, setSubmit] = useState("Submit");

   // Colors stored per question: { [questionId]: ColorObject[] }
   const [questionColors, setQuestionColors] = useState(() => {
      const initial = {};
      questionsData.forEach((q) => {
         const count = q.optionCount || 4;
         initial[q.id] = generateColorObjects(count);
      });
      return initial;
   });
   const router = useRouter();
   const question = questionsData[currentIndex];
   const colors = questionColors[question.id] || [];

   /* ---------- GUARD: NAME / AGE COOKIES ---------- */
   useEffect(() => {
      const name = getCookie("name");
      const age = getCookie("age");
      if (!name || !age) {
         router.push("/");
      }
   }, [router]);

   /* ---------- SENSORS ---------- */
   const mouseSensor = useSensor(MouseSensor);
   const touchSensor = useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
   });
   const sensors = useSensors(mouseSensor, touchSensor);

   /* ---------- DND HANDLERS ---------- */

   const onDragStart = (event) => {
      setActiveId(event.active.id);
      setMounted(true);
      document.body.style.overflow = "hidden";
   };

   const onDragEnd = ({ active, over }) => {
      setMounted(false);
      setActiveId(null);
      document.body.style.overflow = "";

      if (!over || active.id === over.id) return;

      const qId = question.id;
      const direction = question.direction || "light-to-dark";

      setQuestionColors((prev) => {
         const currentList = prev[qId];
         if (!currentList) return prev;

         const oldIndex = currentList.findIndex((c) => c.id === active.id);
         const newIndex = currentList.findIndex((c) => c.id === over.id);
         if (oldIndex === -1 || newIndex === -1) return prev;

         const updated = [...currentList];
         [updated[oldIndex], updated[newIndex]] = [
            updated[newIndex],
            updated[oldIndex],
         ];

         // Compute correctness based on updated order
         const userOrderIds = updated.map((c) => c.id);
         const correctOrderIds = getCorrectOrderFromArray(
            updated,
            direction
         ).map((c) => c.id);

         const isCorrect =
            JSON.stringify(userOrderIds) ===
            JSON.stringify(correctOrderIds);

         // store answer per question
         setAnswers((prevAns) => ({
            ...prevAns,
            [qId]: {
               isCorrect,
               colors: questionColors[qId],
               order: userOrderIds,
            },
         }));

         return {
            ...prev,
            [qId]: updated,
         };
      });
   };

   const onDragCancel = () => {
      document.body.style.overflow = "";
      setActiveId(null);
   };

   /* ---------- NAVIGATION ---------- */

   const goNext = () =>
      setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1));
   const goPrev = () =>
      setCurrentIndex((i) => Math.max(i - 1, 0));

   /* ---------- BREAKPOINT HOOK ---------- */
   const useBreakpoint = () => {
      const [device, setDevice] = useState("desktop");

      useEffect(() => {
         const check = () => {
            const w = window.innerWidth;
            if (w < 640) setDevice("mobile");       // < sm
            else if (w < 1024) setDevice("tablet"); // sm → lg
            else setDevice("desktop");              // ≥ lg
         };

         check();
         window.addEventListener("resize", check);
         return () => window.removeEventListener("resize", check);
      }, []);

      return device;
   };


   /* ---------- PAGINATION LOGIC ---------- */
   const getPagination = (total, currentIndex, device) => {
      const current = currentIndex + 1;

      if (device === "desktop") {
         return Array.from({ length: total }, (_, i) => i + 1);
      }

      // 📱 MOBILE: max 4 items (including dots)
      if (device === "mobile") {
         // Always show first & last
         if (total <= 4) {
            return Array.from({ length: total }, (_, i) => i + 1);
         }

         if (current <= 2) {
            return [1, 2, "dots", total - 1, total];
         }

         if (current >= total - 1) {
            return [1, "dots", total - 2, total - 1, total];
         }

         return [1, "dots", current, "dots", total];
      }

      // 💊 TABLET / DESKTOP: max 7 items
      if (total <= 7) {
         return Array.from({ length: total }, (_, i) => i + 1);
      }

      // Near start
      if (current <= 3) {
         return [1, 2, 3, "dots", total - 1, total];
      }

      // Near end
      if (current >= total - 2) {
         return [1, 2, "dots", total - 2, total - 1, total];
      }

      // Middle
      return [
         1,
         2,
         "dots",
         current - 1,
         current,
         current + 1,
         "dots",
         total - 1,
         total,
      ];
   };



   const device = useBreakpoint();




   /* ---------- SUBMIT ---------- */

   const handleSubmit = async () => {
      setSubmit("Submitting");
      const data = {
         name: getCookie("name"),
         age: getCookie("age"),
         answers,
         totalQuestions,
      };
      console.log(data);
      await saveAssessmentToFirebase(data);
      setSubmit("Submitted");

      alert("Assessment Submitted! Thank you.");
      router.push("/");
   };

   /* ---------- ACTIVE COLOR FOR OVERLAY ---------- */

   const activeColor =
      activeId && colors.find((c) => c.id === activeId)?.color;

   /* ---------- RENDER ---------- */

   return (
      <div className="min-h-screen bg-gray-100">
         {/* Top Navbar */}

         <div className="fixed top-0 w-full bg-white shadow-md flex items-center px-2 sm:px-4 py-3 z-50">
            {/* LEFT */}
            <div className="font-semibold text-sm sm:text-base text-gray-700 whitespace-nowrap">
               Completed: {Object.keys(answers).length} / {totalQuestions}
            </div>

            {/* CENTER – PAGINATION */}
            <div className="flex-1 flex justify-center px-2">
               <div className="flex gap-0.5 sm:gap-1 items-center whitespace-nowrap">
                  {getPagination(totalQuestions, currentIndex, device).map(
                     (item, idx) => {
                        if (item === "dots") {
                           return (
                              <span
                                 key={`dots-${idx}`}
                                 className="px-2 text-gray-400 select-none"
                              >
                                 …
                              </span>
                           );
                        }

                        const pageIndex = item - 1;
                        const answered = answers[item];

                        return (
                           <button
                              key={item}
                              onClick={() => setCurrentIndex(pageIndex)}
                              className={`w-7 h-7 sm:w-8 sm:h-8
                rounded-full text-xs sm:text-sm
                font-medium transition
                ${currentIndex === pageIndex
                                    ? "bg-blue-600 text-white"
                                    : answered
                                       ? "bg-green-500 text-white"
                                       : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                 }
              `}
                           >
                              {item}
                           </button>
                        );
                     }
                  )}
               </div>
            </div>

            {/* RIGHT */}
            <button
               onClick={() => {
                  if (submit.toLowerCase() === "submit") {
                     handleSubmit();
                  } else if (submit.toLowerCase() === "submitting") {
                     alert("Please wait while the assessment is being submitted");
                  } else if (submit.toLowerCase() === "submitted") {
                     alert("Assessment already submitted");
                  }
               }}
               className="px-3 py-1 cursor-pointer bg-purple-600 text-sm sm:text-base text-white rounded-lg font-medium whitespace-nowrap"
            >
               {submit}
            </button>
         </div>


         <div className="flex flex-col items-center pt-24 px-4">
            <h2 className="text-base md:text-lg font-semibold mb-2 text-center">
               Q{question.id}) {question.question}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mb-4">
               {question.direction === "dark-to-light"
                  ? "Drag to arrange from darkest to lightest."
                  : "Drag to arrange from lightest to darkest."}
            </p>

            {/* DND */}
            <DndContext
               sensors={sensors}
               onDragStart={onDragStart}
               onDragEnd={onDragEnd}
               onDragCancel={onDragCancel}
            >
               <div className="grid grid-cols-1 sm:grid-cols-4 gap-0 md:gap-2 bg-white px-10 sm:py-2 py-5 md:px-7 md:py-5 rounded-2xl shadow max-w-xl md:max-w-3xl sm:w-full w-2/3">
                  {colors.map((item) => (
                     <DroppableBox key={item.id} id={item.id}>
                        <DraggableBox id={item.id} color={item.color} />
                     </DroppableBox>
                  ))}
               </div>

               {/* Overlay */}
               {mounted &&
                  createPortal(
                     <DragOverlay adjustScale={false}>
                        {activeId && activeColor ? (
                           <Box dragging color={colors.find((c) => c.id === activeId)?.color} />
                        ) : null}
                     </DragOverlay>,
                     document.body
                  )}
            </DndContext>

            {/* Buttons */}
            <div className="flex justify-between select-none items-center max-w-xl md:max-w-3xl sm:w-full w-2/3 mt-6">
               {/* Prev */}
               {currentIndex > 0 && (
                  <button
                     onClick={goPrev}
                     className="px-6 py-2 bg-gray-400 cursor-pointer hover:bg-gray-500 text-white rounded-lg font-medium"
                  >
                     Prev
                  </button>
               )}

               {/* Next */}
               {currentIndex < totalQuestions - 1 && (
                  <button
                     onClick={goNext}
                     className="ml-auto px-6 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                     Next
                  </button>
               )}
            </div>
         </div>
      </div>
   );
}
