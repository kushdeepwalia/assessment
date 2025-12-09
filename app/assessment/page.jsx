"use client";

import React, { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { createPortal } from 'react-dom';

function Box({ label, dragging }) {
   return (
      <div
         className={`w-24 h-24 flex items-center justify-center
      rounded-xl font-bold text-white shadow-md select-none
      transition
      ${dragging ? "bg-blue-400" : "bg-blue-600"}
    `}
      >
         {label}
      </div>
   );
}

function DraggableBox({ id, label }) {
   const { setNodeRef, listeners, attributes } = useDraggable({ id });

   return (
      <div
         ref={setNodeRef}
         {...listeners}
         {...attributes}
         className="cursor-move"
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
         className={`w-24 h-24 rounded-xl flex items-center justify-center
        border-2 transition
        ${isOver ? "border-blue-500" : "border-blue-500"}
      `}
      >
         {children}
      </div>
   );
}

const Assessment = () => {
   const [boxes, setBoxes] = useState(["A", "B", "C", "D"]);

   const [activeId, setActiveId] = useState(null);

   const onDragStart = (event) => {
      setActiveId(event.active.id);
   };


   const onDragEnd = ({ active, over }) => {
      if (!over || active.id === over.id) return;

      const oldIndex = boxes.indexOf(active.id);
      const newIndex = boxes.indexOf(over.id);

      const updated = [...boxes];
      [updated[oldIndex], updated[newIndex]] = [
         updated[newIndex],
         updated[oldIndex],
      ];

      setBoxes(updated);
   };

   const activeItem = boxes.find((i) => i === activeId);

   return (
      <div>
         <div>
            <span>Ques</span>
            &nbsp;
            <span>1)</span>
            &nbsp;
            <span>What is your name? </span>
         </div>
         <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className='w-full flex flex-row flex-wrap gap-5'>
               {
                  boxes.map((box) => (
                     <DroppableBox key={box} id={box}>
                        <DraggableBox id={box} label={box} />
                     </DroppableBox>
                  ))
               }
               <div className='min-w-60 cursor-pointer max-w-1/4 bg-amber-300 h-40'></div>
               <div className='min-w-60 cursor-pointer max-w-1/4 bg-amber-300 h-40'></div>
               <div className='min-w-60 cursor-pointer max-w-1/4 bg-amber-300 h-40'></div>
               <div className='min-w-60 cursor-pointer max-w-1/4 bg-amber-300 h-40'></div>
            </div>
            {createPortal(
               <DragOverlay adjustScale={false}>
                  {activeItem ? <Box label={activeItem} dragging /> : null}
               </DragOverlay>,
               document.body
            )}
         </DndContext>
      </div>
   )
}

export default Assessment