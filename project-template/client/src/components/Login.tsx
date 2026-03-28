import React, { useState } from 'react'

export default function Login() {
    const [userData, setUserData] = useState({email: '', password: ''})

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setUserData((prev) => ({
            ...prev, [name]: value,
        }))
    }

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault()
        console.log('User Data Submitted:', userData)
        try {
            const response = await fetch('/api/user/login',{
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(userData)
            })
            if (!response.ok) throw new Error("Error submitting data")
            console.log('Success', await response.json())
        } catch (error) {
            console.log('Server error', error)
        }
    }

    return (
        <main className="container">
            <div className="grid">
                <div></div>
                <article>
                    <header style={{textAlign: 'center'}}>Sign in</header>
                    <form onSubmit={handleSubmit}>
                        <input type="email" name="email" placeholder="Email" value={userData.email}
                               onChange={handleChange} required/>
                        <input type="password" name="password" placeholder="Password"
                               value={userData.password} onChange={handleChange} required/>
                        <button type="submit">Login</button>
                    </form>
                </article>
                <div></div>
            </div>
        </main>
    )
}