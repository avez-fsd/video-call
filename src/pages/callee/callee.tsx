import React, { useEffect, useRef, useState } from 'react'
import {db} from '../../firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, addDoc, query, Unsubscribe,deleteDoc, getDocs } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';

export default function Callee() {

  const [joinRoomDisabled, setJoinRoomDisabled] = useState(false);
  const [hangUpDisabled, setHangUpDisabled] = useState(true);
  const [isMediaDevicesAvailable, setMediaDeviceAvailability] = useState(true);

  const {id:roomId} = useParams();

  const navigate = useNavigate();
  
  const localVideo = useRef<HTMLVideoElement>(null!)
  const remoteVideo = useRef<HTMLVideoElement>(null!)
  const peerConnection = useRef<RTCPeerConnection>(null!)
  const callerCandidatesListener = useRef<Unsubscribe>(null!)

  useEffect(()=>{
    navigator.mediaDevices.enumerateDevices().then(e=>{
      if(Array.isArray(e)){
        if(e.find(val => val.label === '')) setMediaDeviceAvailability(false)
        else {
          getUserStream().then(stream=>{
            localVideo.current.srcObject = stream;
          })
        }
      }
    })
    return () => {
      hangUp();
    }
  },[])

  const deleteAllData = async () => {

    {
        const q = query(collection(db, `rooms/${roomId}/calleeIceCandidates`));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((document) => {
            deleteDoc(doc(db, `rooms/${roomId}/calleeIceCandidates`, document.id))
        });
    }

    {
        const q = query(collection(db, `rooms/${roomId}/calleeAnswerOffer`));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((document) => {
            deleteDoc(doc(db, `rooms/${roomId}/calleeAnswerOffer`, document.id))
        });
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

  const handleIceCandidateListener = async (event:any) => {
    const calleeCandidatesCollection = collection(db, `rooms/${roomId}/calleeIceCandidates`)
    if (!event.candidate) return;
    addDoc(calleeCandidatesCollection, {calleeIceCandidates:JSON.stringify(event.candidate)})
  }

  const handleTrackListener = async (event:any) => {
    const [remoteStream] = event.streams;
    remoteVideo.current.srcObject =  remoteStream;
  }

  const callerCandidatesCollectionListener = () => {
    const callerCandidatesCollection = collection(db, `rooms/${roomId}/callerIceCandidates`)
    const q = query(callerCandidatesCollection);
    callerCandidatesListener.current = onSnapshot(q, snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(JSON.parse(data.callerIceCandidates)));
            }
        });
    });
  }

  const handleConnectionStateChange = () => {
    if(peerConnection.current.connectionState === "disconnected"){
      callerCandidatesListener.current()
      deleteAllData().then(()=>{
        setJoinRoomDisabled(false);
      })
    }
  }

  const joinRoom = async () => {

    setJoinRoomDisabled(true);
    setHangUpDisabled(false);

    const collectionRef = collection(db, `rooms/${roomId}/callerOffer`)
    const roomInfo = (await getDoc(doc(collectionRef, roomId))).data();
    
    if(roomInfo?.callerOffer){

      await deleteAllData();
    
      const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
      peerConnection.current = new RTCPeerConnection(configuration);
      peerConnection.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(roomInfo.callerOffer)));

      peerConnection.current.addEventListener('track', handleTrackListener)

      peerConnection.current.addEventListener('icecandidate', handleIceCandidateListener);

      const localStream = await getUserStream();
      localStream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, localStream);
      });

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      try{
        const collectionRef = collection(db, `rooms/${roomId}/calleeAnswerOffer`)
        const docRef = doc(collectionRef, roomId)
        await setDoc(docRef, {calleAnswerOffer:JSON.stringify(answer)})
      }catch(err){
        console.log(err)
        setJoinRoomDisabled(false);
        setHangUpDisabled(true);
      }  


      callerCandidatesCollectionListener();

      peerConnection.current.addEventListener('connectionstatechange', handleConnectionStateChange)   
    }
  }

  const getUserStream = async () => {
    return navigator.mediaDevices.getUserMedia({'video':true,'audio':true});
  }
  
  const hangUp = () => {
    if(peerConnection.current){
      peerConnection.current.removeEventListener('icecandidate', handleConnectionStateChange);
      peerConnection.current.removeEventListener('track', handleTrackListener);
      peerConnection.current.removeEventListener('connectionstatechange', handleConnectionStateChange);
      callerCandidatesListener.current();
      deleteAllData();
      navigate("/");
      peerConnection.current.close();
    }
}

  return (
    <div className='caller-con'>
      <div className='caller-sub-con'>
        <video ref={localVideo} autoPlay muted playsInline/>
        <video ref={remoteVideo} autoPlay playsInline/>
      </div>
      {
        !isMediaDevicesAvailable ? 
            <button disabled= {isMediaDevicesAvailable} onClick={askMediaPermission}>
                Open Video & Microphone
            </button> : 
        ''
      }
      <div className='btn-con'>
        <button className='btn' disabled= {!isMediaDevicesAvailable || joinRoomDisabled} onClick={joinRoom}>
          Join Room
        </button>
        <button className='btn'  disabled= {!isMediaDevicesAvailable || hangUpDisabled} onClick={hangUp}>
          Hang Up
        </button>
      </div>
    </div>
  )
}
