import React from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SessionTimeout = ({ isOpen, onConfirm, onLogout }) => {
    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Session Expired</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your session has witnessed inactivity for a while. Do you want to continue your session?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onLogout}>Logout</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>Continue Session</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default SessionTimeout;
