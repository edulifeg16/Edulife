import React, { useState, useContext } from 'react'; 
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const Chatbot = () => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ from: 'bot', text: 'Hello! How can I help you today?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Don't render the chatbot for admins
    if (user?.role === 'admin') {
        return null;
    }

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { from: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/chatbot/query', { message: input });
            const botMessage = { from: 'bot', text: res.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = { from: 'bot', text: 'Sorry, I am having trouble connecting. Please try again later.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Inline Styles ---
    const chatIconStyle = { position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#4CAF50', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', cursor: 'pointer', zIndex: 1000 };
    const chatWindowStyle = { position: 'fixed', bottom: '100px', right: '20px', width: '350px', height: '450px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, transition: 'all 0.3s ease-in-out', transform: isOpen ? 'scale(1)' : 'scale(0)', transformOrigin: 'bottom right' };
    const messagesContainerStyle = { flexGrow: 1, padding: '10px', overflowY: 'auto' };
    const formStyle = { display: 'flex', padding: '10px', borderTop: '1px solid #eee' };
    const inputStyle = { flexGrow: 1, border: '1px solid #ccc', borderRadius: '20px', padding: '10px', marginRight: '10px' };
    const buttonStyle = { border: 'none', backgroundColor: '#4CAF50', color: 'white', borderRadius: '20px', padding: '10px 15px', cursor: 'pointer' };
    const botMessageStyle = { textAlign: 'left', backgroundColor: '#f1f1f1', borderRadius: '10px', padding: '10px', maxWidth: '80%', alignSelf: 'flex-start', marginBottom: '10px' };
    const userMessageStyle = { textAlign: 'left', backgroundColor: '#d1f1e1', borderRadius: '10px', padding: '10px', maxWidth: '80%', alignSelf: 'flex-end', marginBottom: '10px' };

    return (
        <>
            <div style={chatIconStyle} onClick={toggleChat}>💬</div>
            <div style={chatWindowStyle}>
                <div style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '10px 10px 0 0', textAlign: 'center' }}>
                    <h4>EduLife Assistant</h4>
                </div>
                <div style={messagesContainerStyle}>
                    {messages.map((msg, index) => (
                        <div key={index} style={msg.from === 'bot' ? botMessageStyle : userMessageStyle}>
                            {msg.text}
                        </div>
                    ))}
                    {isLoading && <div style={botMessageStyle}>...</div>}
                </div>
                <form onSubmit={handleSend} style={formStyle}>
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." style={inputStyle} />
                    <button type="submit" style={buttonStyle}>Send</button>
                </form>
            </div>
        </>
    );
};

export default Chatbot;