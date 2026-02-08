import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const DashboardRedirect = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user && user.disabilityType) {
            const dashboardPath = `/dashboard/${user.disabilityType}`;
            navigate(dashboardPath);
        } else {
            // If for some reason user data is not available, send back to login
            navigate('/auth');
        }
    }, [user, navigate]);

    // Display a loading message while redirecting
    return <div>Loading your personalized dashboard...</div>;
};

export default DashboardRedirect;