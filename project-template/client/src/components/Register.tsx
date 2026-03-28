import React, { useState } from 'react'

export default function Register() {
    const [userData, setUserData] = useState({username: '', email: '', password: '', confirmPassword: ''})
    const [isInvalid, setInvalid] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setUserData((prev) => ({
            ...prev, [name]: value,
        }))
    }

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault()
        const passwordMatch = userData.password == userData.confirmPassword
        setInvalid(!passwordMatch); if (!passwordMatch) return
        console.log('User Data Submitted:', userData)
        try {
            const response = await fetch('/api/user/register',{
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
                    <header style={{textAlign: 'center'}}>Sign up</header>
                    <form onSubmit={handleSubmit}>
                        <input type="text" name="username" minLength={3} maxLength={25} placeholder="Username"
                               value={userData.username} onChange={handleChange} required/>
                        <input type="email" name="email" placeholder="Email" value={userData.email}
                               onChange={handleChange} required/>
                        <input type="password" name="password" minLength={3} placeholder="Password"
                               value={userData.password} onChange={handleChange} required/>
                        <input type="password" name="confirmPassword" minLength={3} placeholder="Confirm password"
                               value={userData.confirmPassword} onChange={handleChange} required/>
                        {isInvalid && (
                            <small>Passwords do not match.</small>
                        )}
                        <button type="submit">Register</button>
                    </form>
                </article>
                <div></div>
            </div>
        </main>
    )
}