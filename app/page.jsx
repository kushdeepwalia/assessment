"use client";

import React, { useState } from 'react'
import { setCookie, getCookie, deleteCookie } from "cookies-next";

const Home = () => {
   const [name, setName] = useState("")
   const [age, setAge] = useState("")

   function onSubmit() {
      setCookie("name", name)
      setCookie("age", age);

      alert(getCookie("name"));
   }

   return (
      <div className='w-full h-screen flex justify-center items-center overflow-hidden'>
         <div className='flex w-full items-center flex-col gap-y-5'>
            <h3 className='font-bold text-2xl'>Assessment</h3>
            <div className='flex xl:w-1/3 items-center w-2/3 md:w-1/2 flex-col gap-y-3'>
               <div className='flex flex-col gap-y-2 w-full'>
                  <label htmlFor="name" className='capitalize'>name</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} type="text" name="name" id="name" className='border px-3 py-2 outline-none border-gray-400 rounded' />
               </div>
               <div className='flex flex-col gap-y-2 w-full'>
                  <label htmlFor="age" className='capitalize'>age</label>
                  <input required value={age} onChange={(e) => setAge(e.target.value)} min={1} type="number" name="age" id="age" className='border px-3 py-2 outline-none appearance-none border-gray-400 rounded' />
               </div>
               <input onClick={() => onSubmit()} className='py-2 px-3 bg-blue-500 cursor-pointer rounded text-white font-semibold mt-3' type="submit" value="Submit" />
            </div>
         </div>
      </div>
   )
}

export default Home