"use client";

import React, { useState } from "react";
import questionsData from "@/data/questions.json";
import {
   DndContext, DragOverlay, MouseSensor, TouchSensor,
   useDraggable, useDroppable, useSensor, useSensors
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { useRouter } from "next/navigation";

function Box({ label, dragging }) {
   return (
      <div
         className={`sm:w-36 sm:h-36 w-24 h-24 flex items-center justify-center
      rounded-xl font-bold sm:text-base text-sm text-white shadow-md select-none
      transition
      ${dragging ? "bg-blue-400" : "bg-blue-600"}
    `}
      >
         {label}
      </div>
   );
}

function DraggableBox({ id, label, showHeight }) {
   const { setNodeRef, listeners, attributes } = useDraggable({ id });

   return (
      <div
         ref={setNodeRef}
         {...listeners}
         {...attributes}
         className={`cursor-move flex items-center justify-center ${showHeight ? "sm:h-48 h-36" : ""}`}
      >
         <Box label={label} />
      </div>
   );
}

function DroppableBox({ id, children }) {
   const { setNodeRef, isOver } = useDroppable({ id });

   return (
      <div
         ref={setNodeRef}
         className={`w-full sm:h-48 h-36 rounded-xl flex items-center justify-center
        border-2 transition
        ${isOver ? "border-blue-500" : "border-white"}
      `}
      >
         {children}
      </div>
   );
}

export default function Assessment() {
   const totalQuestions = questionsData.length;
   const [currentIndex, setCurrentIndex] = useState(0);
   const [answers, setAnswers] = useState({});
   const [activeId, setActiveId] = useState(null);
   const [mounted, setMounted] = useState(false);

   const question = questionsData[currentIndex];
   const boxes = question.options;

   const router = useRouter();

   // Redirected here without name/age
   if (!getCookie("name") || !getCookie("age")) {
      router.push("/");
   }

   const mouseSensor = useSensor(MouseSensor);
   const touchSensor = useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
   });
   const sensors = useSensors(mouseSensor, touchSensor);

   const onDragStart = (event) => {
      console.log("Drag Start:", event.active);
      console.log("Option Indexes:", question.correctValue);
      setActiveId(event.active.id);
      setMounted(true);
      document.body.style.overflow = "hidden";
   };

   const onDragEnd = ({ active, over }) => {
      setMounted(false);
      setActiveId(null);
      document.body.style.overflow = "";

      if (!over) return;

      const isSelectType = typeof question.correctValue !== "undefined";

      // SELECT TYPE → Drop a COPY
      if (isSelectType) {
         setAnswers({
            ...answers,
            [question.id]: active.id,
         });
         return;
      }

      // ORDER TYPE → Swap
      if (active.id !== over.id) {
         const oldIndex = boxes.indexOf(active.id);
         const newIndex = boxes.indexOf(over.id);

         const reordered = [...boxes];
         [reordered[oldIndex], reordered[newIndex]] = [
            reordered[newIndex],
            reordered[oldIndex],
         ];

         setAnswers({
            ...answers,
            [question.id]: reordered,
         });

         question.options = reordered; // update view instantly
      }
   };


   const goNext = () => setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1));
   const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

   const handleSubmit = () => {
      const data = {
         name: getCookie("name"),
         age: getCookie("age"),
         answers: JSON.stringify(answers),
         timestamp: new Date().toISOString(),
      };
      setCookie("assessmentData", JSON.stringify(data));
      console.log("Submitted Data:", data);
      deleteCookie("name");
      deleteCookie("age");

      alert("Assessment Submitted! Thank you.");

      router.push("/");
   }

   return (
      <div className="min-h-screen bg-gray-100">
         {/* Top Navbar */}
         <div className="fixed top-0 w-full bg-white shadow-md flex justify-between items-center px-4 py-3 z-50">
            <div className="font-semibold text-gray-700">
               Completed: {Object.keys(answers).length} / {totalQuestions}
            </div>

            {/* Jump Buttons */}
            <div className="flex gap-1">
               {questionsData.map((q, index) => (
                  <button
                     key={q.id}
                     onClick={() => setCurrentIndex(index)}
                     className={`px-2 py-1 rounded-lg text-sm font-medium
                         ${answers[q.id] ? "bg-green-500 text-white" : ""}
                ${currentIndex === index && !answers[q.id]
                           ? "bg-blue-600 text-white"
                           : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
              `}
                  >
                     {q.id}
                  </button>
               ))}
            </div>

            <button onClick={() => handleSubmit()} className="px-3 py-1 cursor-pointer bg-purple-600 text-white rounded-lg font-medium">
               Submit Assessment
            </button>
         </div>

         <div className="flex flex-col items-center pt-24 px-4">
            <h2 className="text-base md:text-lg font-semibold mb-4 text-center">
               Q{question.id}) {question.question}
            </h2>

            {/* DND */}
            <DndContext
               sensors={sensors}
               onDragStart={onDragStart}
               onDragEnd={onDragEnd}
               onDragCancel={() => {
                  document.body.style.overflow = "";
                  setActiveId(null);
               }}
            >
               {/* TYPE 1: SEQUENCE / ORDER QUESTIONS */}
               {question.correctOrder && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:gap-4 bg-white p-5 rounded-2xl shadow max-w-xl md:max-w-3xl w-full">
                     {boxes.map((box) => (
                        <DroppableBox key={box} id={box}>
                           <DraggableBox id={box} label={box} />
                        </DroppableBox>
                     ))}
                  </div>
               )}

               {/* TYPE 2: SELECT QUESTIONS */}
               {typeof question.correctValue !== "undefined" && (
                  <div className="bg-white p-5 rounded-2xl shadow max-w-xl md:max-w-3xl w-full flex flex-col gap-y-4 items-center">

                     {/* All draggable options */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:gap-4 w-full">
                        {boxes.map((box) => (
                           <DraggableBox
                              key={box}
                              id={box}
                              showHeight={question.correctValue !== undefined}
                              label={box}
                           />
                        ))}
                     </div>

                     {/* Drop Target */}
                     <DroppableBox id={question.correctValue}>
                        <div className="border border-dashed border-gray-500 
          w-full h-full flex items-center justify-center rounded-xl">
                           {answers[question.id] ? (
                              <Box label={answers[question.id]} dragging={false} />
                           ) : (
                              <div className="text-gray-500 border border-dashed border-gray-500 
          w-full h-full flex items-center justify-center rounded-xl">
                                 Drop Here
                              </div>
                           )}
                        </div>
                     </DroppableBox>

                  </div>
               )}

               {/* Overlay */}
               {mounted &&
                  createPortal(
                     <DragOverlay adjustScale={false}>
                        {activeId ? <Box label={activeId} dragging /> : null}
                     </DragOverlay>,
                     document.body
                  )}
            </DndContext >

            {/* Buttons */}
            < div className="flex justify-between items-center w-full max-w-xl md:max-w-3xl mt-6" >
               {/* Prev */}
               {
                  currentIndex > 0 && (
                     <button
                        onClick={goPrev}
                        className="px-6 py-2 bg-gray-400 hover:bg-gray-500 
              text-white rounded-lg font-medium"
                     >
                        Prev
                     </button>
                  )
               }

               {/* Next */}
               {
                  currentIndex < totalQuestions - 1 && (
                     <button
                        onClick={goNext}
                        className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 
              text-white rounded-lg font-medium"
                     >
                        Next
                     </button>
                  )
               }
            </div >
         </div >
      </div >
   );
}