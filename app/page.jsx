"use client";

import React, { useState } from 'react'
import { setCookie, getCookie, deleteCookie } from "cookies-next";
import { useRouter } from 'next/navigation';

const Home = () => {
   const [name, setName] = useState("")
   const [age, setAge] = useState("")
   const router = useRouter();

   function onSubmit() {
      if (name === "" || age === "") {
         alert("Please fill in all fields.");
         return;
      }
      setCookie("name", name)
      setCookie("age", age);
      router.push("/assessment");
   }

   return (
      <div className="w-full min-h-screen flex justify-center items-center bg-linear-to-b from-gray-100 to-blue-400 p-6">
         <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md border border-gray-100">

            <h3 className="font-bold text-2xl text-center text-blue-600 mb-6">
               Assessment
            </h3>

            <div className="flex flex-col gap-y-5">

               <div className="flex flex-col gap-y-1">
                  <label htmlFor="name" className="text-gray-700 font-medium">Name</label>
                  <input
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     type="text"
                     autoComplete='off'
                     name="name"
                     id="name"
                     placeholder="Enter your name"
                     className="border border-gray-300 px-4 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
               </div>

               <div className="flex flex-col gap-y-1">
                  <label htmlFor="age" className="text-gray-700 font-medium">Age</label>
                  <input
                     required
                     value={age}
                     onChange={(e) => setAge(e.target.value)}
                     min={1}
                     type="number"
                     name="age"
                     autoComplete='off'
                     id="age"
                     placeholder="Enter your age"
                     className="border appearance-none border-gray-300 px-4 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
               </div>

               <button
                  onClick={() => onSubmit()}
                  type="submit"
                  className="w-full cursor-pointer py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-transform duration-200 hover:scale-[1.02]"
               >
                  Submit
               </button>

            </div>
         </div>
      </div>

   )
}

export default Home