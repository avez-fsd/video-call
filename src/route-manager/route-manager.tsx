import {lazy, Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom'

const CreateCall = lazy(()=> import('../pages/create-call/create-call'))
const Caller = lazy(()=> import('../pages/caller/caller'))
const Callee = lazy(()=> import('../pages/callee/callee'))

const RouteManager = () => {
    
    return (
        <Suspense>
            <Routes>
                <Route path = "/" element={<CreateCall/>}/>
                <Route path = "/room/:id/caller" element={<Caller/>}/>
                <Route path = "/room/:id/callee" element={<Callee/>}/>
                <Route path = "*" element={<Navigate to="/" />}/>
            </Routes>
        </Suspense>
    );
}

export default RouteManager;
