import React, { useEffect, useRef, useState } from 'react'
import {db} from '../../firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, updateDoc, Unsubscribe } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import './index.css'
import Header from '../../components/header';

export default function CreateCall() {

    const [isMediaDevicesAvailable, setMediaDeviceAvailability] = useState(true);
    const [createRoomDisabled, setCreateRoomDisabled] = useState(false);

    const localVideo = useRef<HTMLVideoElement>(null!)

    const navigate = useNavigate();

    useEffect(()=>{
      navigator.mediaDevices.enumerateDevices().then(e=>{
        console.log(e,'here er')
        if(Array.isArray(e)){
          if(e.find(val => val.label === '')) setMediaDeviceAvailability(false)
          else {
        console.log('thid')
            getUserStream().then(stream=>{
              console.log('tesd')
              localVideo.current.srcObject = stream;
            })
          }
        } 
      })
      return () => {
      }
    },[])

    const createRoom = async () => {
      try{
        setCreateRoomDisabled(true);
        const roomId = uuidv4();
        const collectionRef = collection(db, `rooms`);
        const docRef = doc(collectionRef, roomId);
        const deviceId = uuidv4();
        localStorage.setItem("deviceId", deviceId);
        await setDoc(docRef, {lockStatus: false, callerDeviceId:deviceId});
        navigate(`/room/${roomId}/caller`);
      }catch(err){
        setCreateRoomDisabled(false);
        console.log(err)
      }
  }

  const askMediaPermission = async () => {
    try {
      const stream = await getUserStream();
      localVideo.current.srcObject = stream;
      setMediaDeviceAvailability(true)
    } catch(err) {
      setMediaDeviceAvailability(false)
    }
  }

  const getUserStream = async () => {
    return navigator.mediaDevices.getUserMedia({'video':true,'audio':true});
  }

  return (
    <>
      <div className='create-call-con'>
          <div className='local-video-con'>
            <video ref={localVideo} autoPlay muted playsInline>
            </video>
            {
              !isMediaDevicesAvailable ?
                <div className='overlay'>
                  Do you want people to see and hear you in the meeting?
                  <button className='btn video-permission-btn' disabled={isMediaDevicesAvailable} onClick={askMediaPermission}>
                    Open Video & Microphone
                  </button>
                </div> : ''
            }
          </div>
          <div className='btn-con'>
            <button className='btn' disabled= {!isMediaDevicesAvailable || createRoomDisabled} onClick={createRoom}>
                Create Room
            </button>

          </div>
      </div>
    </>
  )
}
