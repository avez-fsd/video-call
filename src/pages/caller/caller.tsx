import React, { useEffect, useRef, useState } from 'react'
import {db} from '../../firebase';
import { collection, doc, onSnapshot, setDoc, addDoc, query, getDocs, getDoc, deleteDoc, Unsubscribe } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';

const Caller = () => {

    const [isMediaDevicesAvailable, setMediaDeviceAvailability] = useState(true);
    const [createRoomDisabled, setCreateRoomDisabled] = useState(false);
    const [hangUpDisabled, setHangUpDisabled] = useState(true);

    const {id:roomId} = useParams();
    
    const navigate = useNavigate();

    const localVideo = useRef<HTMLVideoElement>(null!)
    const remoteVideo = useRef<HTMLVideoElement>(null!)

    const peerConnection = useRef<RTCPeerConnection>(null!)
    const calleeIceCandidatesListener = useRef<Unsubscribe>(null!)
    const calleAnswerOfferListener = useRef<Unsubscribe>(null!)

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
        deleteAllData().then(()=>{
            establishConnection(roomId as string);
        });
        return () => {
            hangUp();
        }
      },[])

    const deleteAllData = async () => {
        {
            const q = query(collection(db, `rooms/${roomId}/callerIceCandidates`));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((document) => {
                deleteDoc(doc(db, `rooms/${roomId}/callerIceCandidates`, document.id))
            });
        }

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

        {
            const q = query(collection(db, `rooms/${roomId}/callerOffer`));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((document) => {
                deleteDoc(doc(db, `rooms/${roomId}/callerOffer`, document.id))
            });
        }
    }

    const getUserStream = async () => {
        return navigator.mediaDevices.getUserMedia({'video':true,'audio':true});
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
        const callerCandidatesCollection = collection(db, `rooms/${roomId}/callerIceCandidates`)
        if (!event.candidate) return;
        addDoc(callerCandidatesCollection, {callerIceCandidates:JSON.stringify(event.candidate)})
    }

    const handleTrackListener = async (event:any) => {
        const [remoteStream] = event.streams;
        remoteVideo.current.srcObject =  remoteStream;
    }

    const calleeAnswerOfferListener = async () => {
        const collectionRef = collection(db, `rooms/${roomId}/calleeAnswerOffer`)
        calleAnswerOfferListener.current = onSnapshot(doc(collectionRef,`${roomId}`), async (doc)=>{
            const data = doc.data();
            if(peerConnection.current.remoteDescription) {
                window.location.reload();
            }
            if(data?.calleAnswerOffer && !peerConnection.current.remoteDescription) {
              const remoteDesc = new RTCSessionDescription(JSON.parse(data.calleAnswerOffer));
              await peerConnection.current.setRemoteDescription(remoteDesc);
            }
        })
    }

    const calleeCandidatesListener = async () => {
        const calleeCandidatesCollection = collection(db, `rooms/${roomId}/calleeIceCandidates`)
        const q = query(calleeCandidatesCollection);
        calleeIceCandidatesListener.current = onSnapshot(q, snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(data,'here the datat')
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(JSON.parse(data.calleeIceCandidates)));
                }
            });
        });
    }

    const handleConnectionStateChange = (event:any) => {

    }

    const establishConnection = async (roomId:string) => {
        const localStream = await getUserStream();
        const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
        peerConnection.current = new RTCPeerConnection(configuration);


        peerConnection.current.addEventListener('icecandidate', handleIceCandidateListener);

        calleeCandidatesListener();

        localStream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, localStream);
        })

        const callerOffer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(callerOffer);

        try{
            const collectionRef = collection(db, `rooms/${roomId}/callerOffer`)
            const docRef = doc(collectionRef, roomId)
            await setDoc(docRef, {callerOffer:JSON.stringify(callerOffer)})
        }catch(err){
            setCreateRoomDisabled(false);
            setHangUpDisabled(true);
            console.log(err)
        }    
      
        calleeAnswerOfferListener();
    
        peerConnection.current.addEventListener('track', handleTrackListener)

        peerConnection.current.addEventListener('connectionstatechange', handleConnectionStateChange)

    }

    const hangUp = () => {
        if(peerConnection.current){
            peerConnection.current.removeEventListener('icecandidate', handleConnectionStateChange);
            peerConnection.current.removeEventListener('connectionstatechange', handleConnectionStateChange);
            peerConnection.current.removeEventListener('track', handleTrackListener);
            calleAnswerOfferListener.current();
            calleeIceCandidatesListener.current();
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
            Please share this link to your friend: {`http://localhost:3000/room/${roomId}/callee/${window.location.host}`}
            <div className='btn-con'>
                <button className='btn' onClick={hangUp}>
                    Hang Up
                </button>
            </div>
        </div>
    )
}

export default Caller;