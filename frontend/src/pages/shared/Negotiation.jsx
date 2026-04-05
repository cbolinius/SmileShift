import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNegotiation } from '../../context/NegotiationContext';
import { Button, LoadingSpinner, CountdownTimer } from '../../components/common';
import styles from './Negotiation.module.css';

function Negotiation() {
    const { user, isRegular, isBusiness } = useAuth();
    const { socket, sendNegotiationMessage, joinNegotiationRoom, joinedRooms, isConnected } = useSocket();
    const {
        activeNegotiation: contextNegotiation,
        messages: contextMessages,
        loading,
        error,
        submitDecision,
        withdrawDecision,
        clearNegotiation,
        fetchActiveNegotiation
    } = useNegotiation();
    const navigate = useNavigate();
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
    const messagesEndRef = useRef(null);

    // Local storage for ended negotiation
    const [endedNegotiation, setEndedNegotiation] = useState(null);
    const [endedMessages, setEndedMessages] = useState([]);
    const [endedDecisions, setEndedDecisions] = useState({ candidate: null, business: null });
    const [isLocallyExpired, setIsLocallyExpired] = useState(false);

    // When context negotiation becomes non-active (failed/success), save it locally
    useEffect(() => {
        if (contextNegotiation) {
            if (contextNegotiation.status !== 'active') {
                // Save ended negotiation
                setEndedNegotiation(contextNegotiation);
                setEndedMessages([...contextMessages]);
                setEndedDecisions({
                    candidate: contextNegotiation.decisions?.candidate,
                    business: contextNegotiation.decisions?.business
                });
            } else {
                // Active negotiation, clear ended state
                setEndedNegotiation(null);
                setEndedMessages([]);
                setEndedDecisions({ candidate: null, business: null });
                setIsLocallyExpired(false);
            }
        }
    }, [contextNegotiation, contextMessages]);

    // Use ended negotiation if available, otherwise context
    const activeNegotiation = endedNegotiation || contextNegotiation;
    const displayMessages = endedNegotiation ? endedMessages : contextMessages;
    const displayDecisions = endedNegotiation ? endedDecisions : (contextNegotiation?.decisions || { candidate: null, business: null });

    // Determine status flags
    const isActive = contextNegotiation?.status === 'active' && !isLocallyExpired && !endedNegotiation;
    const isSuccess = (endedNegotiation?.status === 'success') || (contextNegotiation?.status === 'success');
    const isFailed = (endedNegotiation?.status === 'failed') || (contextNegotiation?.status === 'failed');
    const isExpired = isLocallyExpired || (endedNegotiation?.status === 'expired') || (contextNegotiation?.status === 'expired');

    // Helper functions
    const getOtherPartyName = () => {
        if (!activeNegotiation) return '';
        if (isRegular) {
            return activeNegotiation.job?.business?.business_name ||
                   activeNegotiation.business?.business_name ||
                   activeNegotiation.job?.businessName ||
                   'Business';
        }
        if (isBusiness) {
            const userData = activeNegotiation.user;
            if (userData) {
                return `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Candidate';
            }
            return activeNegotiation.candidate?.first_name ?
                   `${activeNegotiation.candidate.first_name} ${activeNegotiation.candidate.last_name}` :
                   'Candidate';
        }
        return 'Other Party';
    };

    const getMyDecision = () => {
        if (!displayDecisions) return null;
        if (isRegular) return displayDecisions.candidate;
        if (isBusiness) return displayDecisions.business;
        return null;
    };

    const getOtherDecision = () => {
        if (!displayDecisions) return null;
        if (isRegular) return displayDecisions.business;
        if (isBusiness) return displayDecisions.candidate;
        return null;
    };

    const getSalaryDisplay = () => {
        const job = activeNegotiation?.job;
        if (!job) return '—';
        const min = job.salary_min ?? job.salaryMin;
        const max = job.salary_max ?? job.salaryMax;
        if (min && max) return `$${min} – $${max}/hr`;
        if (min) return `From $${min}/hr`;
        if (max) return `Up to $${max}/hr`;
        return '—';
    };

    const getScheduleDisplay = () => {
        const job = activeNegotiation?.job;
        if (!job) return '—';
        const start = job.start_time ?? job.startTime;
        const end = job.end_time ?? job.endTime;
        if (!start || !end) return '—';
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);
            if (isNaN(startDate) || isNaN(endDate)) return '—';

            // Format start date and time
            const formattedStart = startDate.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Check if end date is on the same day as start date
            const isSameDay = startDate.toDateString() === endDate.toDateString();

            let formattedEnd;
            if (isSameDay) {
                // Same day - only show time
                formattedEnd = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                // Different day - show full date and time
                formattedEnd = endDate.toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            return `${formattedStart} – ${formattedEnd}`;
        } catch (e) {
            return '—';
        }
    };

    const myDecision = getMyDecision();
    const otherDecision = getOtherDecision();

    const getStatusMessage = () => {
        if (isSuccess || isFailed || isExpired) return null;
        if (!isActive) return null;
        if (myDecision === 'accept' && !otherDecision) {
            return `Waiting for ${getOtherPartyName()} to respond...`;
        }
        if (myDecision === 'accept' && otherDecision === 'accept') {
            return 'Both parties accepted! Finalizing...';
        }
        if (!myDecision && otherDecision === 'accept') {
            return `${getOtherPartyName()} has accepted. Waiting for your decision.`;
        }
        return null;
    };

    // Socket and message handlers
    useEffect(() => {
        if (activeNegotiation) console.log('Negotiation data:', activeNegotiation);
    }, [activeNegotiation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayMessages]);

    useEffect(() => {
        if (activeNegotiation?.id && socket && isConnected && isActive) {
            if (!joinedRooms.has(activeNegotiation.id)) {
                joinNegotiationRoom(activeNegotiation.id);
            }
        }
    }, [activeNegotiation, socket, isConnected, joinedRooms, joinNegotiationRoom, isActive]);

    // Retry fetching negotiation if none exists (handles race conditions)
    useEffect(() => {
        let retryTimeout;
        if (!loading && !activeNegotiation && !isLocallyExpired) {
            retryTimeout = setTimeout(() => {
                console.log('No negotiation found, retrying fetch...');
                fetchActiveNegotiation();
            }, 1000);
        }
        return () => clearTimeout(retryTimeout);
    }, [loading, activeNegotiation, isLocallyExpired, fetchActiveNegotiation]);

    const handleClose = () => {
        navigate(isRegular ? '/interests' : '/business/interests');
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        if (!isActive) {
            setLocalError('No active negotiation');
            return;
        }
        setSending(true);
        setLocalError('');
        const success = sendNegotiationMessage(activeNegotiation.id, messageText.trim());
        if (success) {
            setMessageText('');
        } else {
            setLocalError('Failed to send message. Check your connection.');
        }
        setSending(false);
    };

    const handleAccept = async () => {
        if (!isActive) return;
        const result = await submitDecision(activeNegotiation.id, 'accept');
        if (!result.success) setLocalError(result.error);
    };

    const handleDecline = async () => {
        if (!isActive) return;
        const result = await submitDecision(activeNegotiation.id, 'decline');
        if (result.success) {
            setShowDeclineConfirm(false);
        } else {
            setLocalError(result.error);
        }
    };

    const handleWithdrawAccept = async () => {
        if (!isActive) return;
        const result = await withdrawDecision(activeNegotiation.id);
        if (!result.success) setLocalError(result.error);
    };

    // Loading state
    if (loading && !activeNegotiation) {
        return <div className={styles.container}><LoadingSpinner /></div>;
    }

    // No negotiation at all
    if (!activeNegotiation) {
        return (
            <div className={styles.noNegotiationContainer}>
                <div className={styles.noNegotiationCard}>
                    <h2 className={styles.title}>No Active Negotiation</h2>
                    <p className={styles.noNegotiationMessage}>You don't have an active negotiation at the moment.</p>
                    <Button variant="primary" onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    // Ended view (failed, success, or expired)
    if (isFailed || isSuccess || isExpired) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.container}>
                    <div className={styles.negotiationCard}>
                        <button onClick={handleClose} className={styles.closeButton} title="Close negotiation">✕</button>
                        <div className={styles.twoColumnLayout}>
                            <div className={styles.leftColumn}>
                                <div className={styles.header}>
                                    <div>
                                        <h2 className={styles.jobTitle}>
                                            {activeNegotiation.job?.position_type?.name ||
                                             activeNegotiation.position_type?.name ||
                                             'Job Position'}
                                        </h2>
                                        <p className={styles.businessName}>with {getOtherPartyName()}</p>
                                    </div>
                                    <div className={styles.headerRight}>
                                        <span className={`${styles.status} ${isSuccess ? styles.success : isExpired ? styles.expired : styles.failed}`}>
                                            {isSuccess ? 'Filled' : isExpired ? 'Expired' : 'Ended'}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.jobDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Salary</span>
                                        <span className={styles.detailValue}>{getSalaryDisplay()}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Schedule</span>
                                        <span className={styles.detailValue}>{getScheduleDisplay()}</span>
                                    </div>
                                </div>
                                <div className={styles.decisionStatus}>
                                    <div className={styles.decisionItem}>
                                        <span className={styles.decisionLabel}>Your decision:</span>
                                        {myDecision ? (
                                            <span className={`${styles.decisionBadge} ${myDecision === 'accept' ? styles.accept : styles.decline}`}>
                                                {myDecision === 'accept' ? '✓ Accepted' : '✗ Declined'}
                                            </span>
                                        ) : (
                                            <span className={styles.decisionPending}>—</span>
                                        )}
                                    </div>
                                    <div className={styles.decisionItem}>
                                        <span className={styles.decisionLabel}>Other party:</span>
                                        {(() => {
                                            let displayOtherDecision = otherDecision;
                                            // Case 1: Current user declined, other decision unknown → other never decided
                                            // Case 2: Current user accepted, other decision unknown → other must have declined
                                            if (isFailed && !displayOtherDecision && myDecision === 'accept') {
                                                displayOtherDecision = 'decline';
                                            }
                                            // Case 3: Current user accepted, other decision unknown → other must have accepted
                                            if (isSuccess && !displayOtherDecision && myDecision === 'accept') {
                                                displayOtherDecision = 'accept';
                                            }
                                            // Case 4: No one decided (both null) and negotiation ended → other must have declined
                                            if (isFailed && !displayOtherDecision && !myDecision) {
                                                displayOtherDecision = 'decline';
                                            }
                                            return displayOtherDecision ? (
                                                <span className={`${styles.decisionBadge} ${displayOtherDecision === 'accept' ? styles.accept : styles.decline}`}>
                                                    {displayOtherDecision === 'accept' ? '✓ Accepted' : '✗ Declined'}
                                                </span>
                                            ) : (
                                                <span className={styles.decisionPending}>—</span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.rightColumn}>
                                <div className={styles.chatSection}>
                                    <h3 className={styles.chatTitle}>Negotiation Chat</h3>
                                    <div className={styles.messagesContainer}>
                                        {displayMessages.length === 0 ? (
                                            <p className={styles.emptyMessages}>No messages were exchanged.</p>
                                        ) : (
                                            displayMessages.map((msg, idx) => {
                                                const isOwn = (isRegular && msg.sender?.role === 'regular') ||
                                                              (isBusiness && msg.sender?.role === 'business');
                                                const getSenderName = () => {
                                                    if (isOwn) return 'You';
                                                    if (isRegular && msg.sender?.role === 'business')
                                                        return activeNegotiation?.job?.business?.business_name || 'Business';
                                                    if (isBusiness && msg.sender?.role === 'regular') {
                                                        const userData = activeNegotiation?.user;
                                                        return `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Candidate';
                                                    }
                                                    return 'Other';
                                                };
                                                return (
                                                    <div key={idx} className={`${styles.message} ${isOwn ? styles.ownMessage : styles.otherMessage}`}>
                                                        <div className={styles.messageHeader}>
                                                            <span className={styles.messageSender}>{getSenderName()}</span>
                                                            <span className={styles.messageTime}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className={styles.messageText}>{msg.text}</p>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className={styles.messageForm}>
                                        <input type="text" placeholder={isSuccess ? "Job has been filled" : "Negotiation has ended"} className={styles.messageInput} disabled />
                                        <Button type="button" variant="primary" size="md" disabled>Send</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={isSuccess ? styles.successBanner : isExpired ? styles.expiredBanner : styles.failedBanner}>
                            {isSuccess ? "Negotiation successful! The job has been filled." :
                             isExpired ? "Negotiation expired. The job is still open." :
                             "Negotiation ended. The job is still open."}
                            <Button variant="primary" size="sm" onClick={handleClose} className={styles.resultButton}>Close</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active negotiation view
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.negotiationCard}>
                    <button onClick={handleClose} className={styles.closeButton} title="Close negotiation">✕</button>
                    <div className={styles.twoColumnLayout}>
                        <div className={styles.leftColumn}>
                            <div className={styles.header}>
                                <div>
                                    <h2 className={styles.jobTitle}>
                                        {activeNegotiation.job?.position_type?.name ||
                                         activeNegotiation.position_type?.name ||
                                         'Job Position'}
                                    </h2>
                                    <p className={styles.businessName}>with {getOtherPartyName()}</p>
                                </div>
                                <div className={styles.headerRight}>
                                    <CountdownTimer
                                        expiresAt={activeNegotiation.expiresAt}
                                        onExpire={() => {
                                            console.log('Timer expired, marking as expired locally');
                                            setIsLocallyExpired(true);
                                        }}
                                    />
                                    <span className={`${styles.status} ${styles[activeNegotiation.status]}`}>
                                        {activeNegotiation.status === 'active' ? 'Active' :
                                             activeNegotiation.status === 'success' ? 'Success' :
                                             activeNegotiation.status === 'failed' ? 'Failed' :
                                             activeNegotiation.status}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.jobDetails}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Salary</span>
                                    <span className={styles.detailValue}>{getSalaryDisplay()}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Schedule</span>
                                    <span className={styles.detailValue}>{getScheduleDisplay()}</span>
                                </div>
                            </div>
                            <div className={styles.decisionStatus}>
                                <div className={styles.decisionItem}>
                                    <span className={styles.decisionLabel}>Your decision:</span>
                                    {myDecision ? (
                                        <span className={`${styles.decisionBadge} ${myDecision === 'accept' ? styles.accept : styles.decline}`}>
                                            {myDecision === 'accept' ? '✓ Accepted' : '✗ Declined'}
                                            {myDecision === 'accept' && isActive && (
                                                <button onClick={handleWithdrawAccept} className={styles.withdrawButton} title="Withdraw acceptance">↻</button>
                                            )}
                                        </span>
                                    ) : (
                                        <span className={styles.decisionPending}>Pending</span>
                                    )}
                                </div>
                                <div className={styles.decisionItem}>
                                    <span className={styles.decisionLabel}>Other party:</span>
                                    {otherDecision ? (
                                        <span className={`${styles.decisionBadge} ${styles[otherDecision]}`}>
                                            {otherDecision === 'accept' ? '✓ Accepted' : '✗ Declined'}
                                        </span>
                                    ) : (
                                        <span className={styles.decisionPending}>Pending</span>
                                    )}
                                </div>
                            </div>
                            {isActive && getStatusMessage() && (
                                <div className={styles.statusMessage}>{getStatusMessage()}</div>
                            )}
                            {isActive && !myDecision && (
                                <div className={styles.decisionButtonsDesktop}>
                                    <Button variant="success" size="md" onClick={handleAccept} disabled={loading} fullWidth>✓ Accept</Button>
                                    <Button variant="danger" size="md" onClick={() => setShowDeclineConfirm(true)} disabled={loading} fullWidth>✗ Decline</Button>
                                </div>
                            )}
                        </div>
                        <div className={styles.rightColumn}>
                            {isActive && (
                                <div className={styles.chatSection}>
                                    <h3 className={styles.chatTitle}>Negotiation Chat</h3>
                                    <div className={styles.messagesContainer}>
                                        {displayMessages.length === 0 ? (
                                            <p className={styles.emptyMessages}>No messages yet. Start the conversation!</p>
                                        ) : (
                                            displayMessages.map((msg, idx) => {
                                                const isOwn = (isRegular && msg.sender?.role === 'regular') ||
                                                              (isBusiness && msg.sender?.role === 'business');
                                                const getSenderName = () => {
                                                    if (isOwn) return 'You';
                                                    if (isRegular && msg.sender?.role === 'business')
                                                        return activeNegotiation.job?.business?.business_name || 'Business';
                                                    if (isBusiness && msg.sender?.role === 'regular') {
                                                        const userData = activeNegotiation.user;
                                                        return `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Candidate';
                                                    }
                                                    return 'Other';
                                                };
                                                return (
                                                    <div key={idx} className={`${styles.message} ${isOwn ? styles.ownMessage : styles.otherMessage}`}>
                                                        <div className={styles.messageHeader}>
                                                            <span className={styles.messageSender}>{getSenderName()}</span>
                                                            <span className={styles.messageTime}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className={styles.messageText}>{msg.text}</p>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <form onSubmit={handleSendMessage} className={styles.messageForm}>
                                        <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message..." className={styles.messageInput} disabled={!isActive || myDecision === 'decline'} />
                                        <Button type="submit" variant="primary" size="md" disabled={!isActive || sending || !messageText.trim() || myDecision === 'decline'}>{sending ? 'Sending...' : 'Send'}</Button>
                                    </form>
                                </div>
                            )}
                            {isActive && !myDecision && (
                                <div className={styles.decisionButtonsMobile}>
                                    <Button variant="success" size="md" onClick={handleAccept} disabled={loading} fullWidth>✓ Accept</Button>
                                    <Button variant="danger" size="md" onClick={() => setShowDeclineConfirm(true)} disabled={loading} fullWidth>✗ Decline</Button>
                                </div>
                            )}
                        </div>
                    </div>
                    {(error || localError) && <div className={styles.errorBanner}>{error || localError}</div>}
                    {showDeclineConfirm && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <h3 className={styles.modalTitle}>Confirm Decline</h3>
                                <p className={styles.modalMessage}>Are you sure you want to decline this negotiation? This will end the negotiation and cannot be undone.</p>
                                <div className={styles.modalButtons}>
                                    <Button variant="danger" size="md" onClick={handleDecline}>Yes, Decline</Button>
                                    <Button variant="secondary" size="md" onClick={() => setShowDeclineConfirm(false)}>Cancel</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Negotiation;
