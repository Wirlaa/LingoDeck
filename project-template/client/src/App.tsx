import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Register from "./components/Register.tsx"
import Login from "./components/Login.tsx"

function App() {
    return (
        <>
            <h1>Project</h1>
            <BrowserRouter>
                <Routes>
                    <Route path="/register" element={<Register/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="*" element={<h1>404: This is not the webpage you are looking for</h1>}/>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App
