import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/apiConfig';
import { AuthContext } from '../context/AuthContext';
import '../index.css'; // Ensure styles are applied

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    standard: '',
    disabilityType: '',
  });

  const handleRegisterChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // This part must use the correct state variables
      const res = await api.post('/auth/login', { 
        email: loginEmail, 
        password: loginPassword 
      });

      login(res.data.user, res.data.token); // Use context to set user state

      if (res.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // The error message you see is set here
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        standard: parseInt(formData.standard),
        disabilityType: formData.disabilityType,
      };
      await api.post('/auth/register', registerData);
      const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed.');
    }
  };

  return (
    <div className='auth-page-background'>
      <div className='form-container'>
        <div className='form-toggle'>
          <button className={isLoginView ? 'active' : ""} onClick={() => setIsLoginView(true)}>Login</button>
          <button className={!isLoginView ? 'active' : ""} onClick={() => setIsLoginView(false)}>Sign Up</button>
        </div>
        {error && <p className="error-message">{error}</p>}
        {isLoginView ? (
            <form className='form' onSubmit={handleLoginSubmit}>
            <h2>Login</h2>
            <input type='email' placeholder='Email' value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            <input type='password' placeholder='Password' value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            <button type="submit">Login</button>
            <p>Not a member? <button type="button" className="link-button" onClick={() => { setIsLoginView(false); setError(''); }}>Signup now</button></p>
          </form>
        ) : (
          <form className='form' onSubmit={handleRegisterSubmit}>
            <h2>Sign Up</h2>
            <input name='name' type='text' placeholder='Full Name' value={formData.name} onChange={handleRegisterChange} required/>
            <input name='email' type='email' placeholder='Email' value={formData.email} onChange={handleRegisterChange} required/>
            <input name='age' type='number' placeholder='Age' value={formData.age} onChange={handleRegisterChange} required/>
            <select name='standard' value={formData.standard} onChange={handleRegisterChange} required>
              <option value="" disabled>Select Class</option>
              <option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option>
            </select>
            <select name='disabilityType' value={formData.disabilityType} onChange={handleRegisterChange} required>
              <option value="" disabled>Select Disability</option>
              <option value="hearing">Hearing Impaired</option><option value="visual">Visually Impaired</option><option value="cognitive">Cognitive Impaired</option><option value="mobility">Mobility Impaired</option>
            </select>
            <input name='password' type='password' placeholder='Password' value={formData.password} onChange={handleRegisterChange} required/>
            <input name='confirmPassword' type='password' placeholder='Confirm Password' value={formData.confirmPassword} onChange={handleRegisterChange} required/>
            <button type="submit">Sign Up</button>
          </form>
        )}
      </div>
    </div>
  );
};
export default AuthPage;