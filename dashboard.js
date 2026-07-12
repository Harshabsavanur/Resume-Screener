// Server API configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://your-backend-api.onrender.com'; // Replace with your deployed backend URL

document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard: redirect to login if not authenticated
    const userRaw = sessionStorage.getItem('nexusnlp_user');
    if (!userRaw) {
        window.location.href = 'login.html';
        return;
    }

    // Populate User Bar
    const user = JSON.parse(userRaw);
    document.getElementById('user-bar-name').textContent = user.fullName || 'User';
    document.getElementById('user-bar-email').textContent = user.email || '';

    // Logout Handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('nexusnlp_user');
        window.location.href = 'login.html';
    });

    // Theme Switcher Logic
    const themeToggle = document.getElementById('theme-toggle');
    
    function updateThemeIcons() {
        if (!themeToggle) return;
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const isDark = document.documentElement.classList.contains('dark-theme');
        if (isDark) {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
    
    updateThemeIcons();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons();
        });
    }

    // Retrieve jobId from query params
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('jobId');
    if (!jobId) {
        alert('No screening ID specified in URL. Redirecting to upload page.');
        window.location.href = 'index.html';
        return;
    }

    // Page State
    let allCandidates = [];
    let selectedCandidateId = null;
    let activeFilter = 'all';
    let searchQuery = '';
    let currentJobTitle = '';

    // Elements
    const jobTitleDisplay = document.getElementById('job-title-display');
    const reqExpDisplay = document.getElementById('req-exp');
    const reqCgpaDisplay = document.getElementById('req-cgpa');
    const totalCandidatesDisplay = document.getElementById('total-candidates');
    const searchInput = document.getElementById('search-input');
    const candidatesListTbody = document.getElementById('candidates-list-tbody');
    const noCandidatesMessage = document.getElementById('no-candidates-message');
    const emptyInspection = document.getElementById('empty-inspection');
    const inspectionDetails = document.getElementById('inspection-details');
    const backBtn = document.getElementById('back-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    // Notes & Candidate Actions Elements
    const candidateNotes = document.getElementById('candidate-notes');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const deleteCandidateBtn = document.getElementById('delete-candidate-btn');
    const btnShortlist = document.getElementById('btn-shortlist');
    const btnReject = document.getElementById('btn-reject');

    // Email Elements
    const inspectedEmail = document.getElementById('inspected-email');
    const emailNotificationSection = document.getElementById('email-notification-section');
    const candidateEmailInput = document.getElementById('candidate-email-input');
    const companyNameInput = document.getElementById('company-name-input');
    const btnSendEmail = document.getElementById('btn-send-email');
    const emailStatusMsg = document.getElementById('email-status-msg');
    const notifyAllBtn = document.getElementById('notify-all-btn');
    const btnShortlistCount = document.getElementById('btn-shortlist-count');

    // Bulk Email Modal Elements
    const bulkEmailModal = document.getElementById('bulk-email-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const bulkCancelBtn = document.getElementById('bulk-cancel-btn');
    const bulkSendBtn = document.getElementById('bulk-send-btn');
    const bulkCompanyNameInput = document.getElementById('bulk-company-name-input');
    const modalCandidatesCount = document.getElementById('modal-candidates-count');
    const modalCandidatesTbody = document.getElementById('modal-candidates-tbody');
    const modalSmtpBanner = document.getElementById('modal-smtp-banner');
    const smtpBannerBadge = document.getElementById('smtp-banner-badge');
    const smtpBannerText = document.getElementById('smtp-banner-text');
    const bulkProgressContainer = document.getElementById('bulk-progress-container');
    const bulkProgressLabel = document.getElementById('bulk-progress-label');
    const bulkProgressPercent = document.getElementById('bulk-progress-percent');
    const bulkProgressBar = document.getElementById('bulk-progress-bar');

    // Fetch Screening Data from Database
    fetchScreeningData();

    function fetchScreeningData() {
        fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
            .then(res => {
                if (!res.ok) throw new Error('Screening session not found');
                return res.json();
            })
            .then(data => {
                allCandidates = data.candidates || [];
                
                // Initialize Header Info
                currentJobTitle = data.jobTitle || 'the position';
                jobTitleDisplay.textContent = data.jobTitle ? `Screening Results for ${data.jobTitle}` : 'Screening Results';
                reqExpDisplay.textContent = data.minExperience || '0';
                reqCgpaDisplay.textContent = data.minCgpa ? `${data.minCgpa}/10` : 'N/A';
                totalCandidatesDisplay.textContent = allCandidates.length;

                renderAnalytics();
                renderCandidatesDirectory();

                // Auto select first candidate if available and none selected yet
                if (allCandidates.length > 0 && selectedCandidateId === null) {
                    const firstCand = allCandidates[0];
                    selectedCandidateId = firstCand.id;
                    inspectCandidate(firstCand);
                }
            })
            .catch(err => {
                alert('Failed to load screening results: ' + err.message);
                window.location.href = 'index.html';
            });
    }

    // Attach Listeners
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    deleteSessionBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete this entire screening session and all candidates? This cannot be undone.')) return;
        
        fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete screening session');
            window.location.href = 'index.html';
        })
        .catch(err => alert('Delete failed: ' + err.message));
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderCandidatesDirectory();
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.getAttribute('data-filter');
            renderCandidatesDirectory();
        });
    });

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.inspection-tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            tabButtons.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text-muted)';
            });
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--primary)';
            tab.style.color = 'var(--primary)';
            
            const targetTab = tab.getAttribute('data-tab');
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) {
                targetPane.style.display = 'block';
            }
        });
    });

    function resetTabs() {
        tabButtons.forEach(t => {
            if (t.getAttribute('data-tab') === 'overview') {
                t.classList.add('active');
                t.style.borderBottomColor = 'var(--primary)';
                t.style.color = 'var(--primary)';
            } else {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text-muted)';
            }
        });
        document.querySelectorAll('.tab-pane').forEach(p => {
            if (p.id === 'tab-overview') {
                p.style.display = 'block';
            } else {
                p.style.display = 'none';
            }
        });
    }

    saveNotesBtn.addEventListener('click', () => {
        if (!selectedCandidateId) return;
        const notesValue = candidateNotes.value;
        const emailValue = candidateEmailInput ? candidateEmailInput.value.trim() : '';
        const btnText = saveNotesBtn.querySelector('.btn-text');
        
        btnText.textContent = 'Saving...';
        saveNotesBtn.disabled = true;

        fetch(`${API_BASE_URL}/api/candidates/${selectedCandidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: notesValue, email: emailValue })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to update details');
            return res.json();
        })
        .then(() => {
            btnText.textContent = 'Saved!';
            
            // Sync notes and email in local cache
            const cand = allCandidates.find(c => c.id === selectedCandidateId);
            if (cand) {
                cand.details.notes = notesValue;
                cand.details.email = emailValue;
                if (inspectedEmail) {
                    inspectedEmail.textContent = emailValue ? `✉ ${emailValue}` : '✉ No email found';
                }
            }

            setTimeout(() => {
                btnText.textContent = 'Save Notes';
                saveNotesBtn.disabled = false;
            }, 1000);
        })
        .catch(err => {
            alert('Save failed: ' + err.message);
            btnText.textContent = 'Save Notes';
            saveNotesBtn.disabled = false;
        });
    });

    deleteCandidateBtn.addEventListener('click', () => {
        if (!selectedCandidateId) return;
        if (!confirm('Are you sure you want to delete this candidate from the list?')) return;

        fetch(`${API_BASE_URL}/api/candidates/${selectedCandidateId}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete candidate');
            return res.json();
        })
        .then(() => {
            // Remove from local list
            allCandidates = allCandidates.filter(c => c.id !== selectedCandidateId);
            selectedCandidateId = null;

            // Reset Inspection UI
            emptyInspection.style.display = 'block';
            inspectionDetails.style.display = 'none';

            // Re-index ranks
            allCandidates.forEach((c, idx) => c.rank = idx + 1);
            totalCandidatesDisplay.textContent = allCandidates.length;

            renderAnalytics();
            renderCandidatesDirectory();

            // Auto-select the new first candidate if available
            if (allCandidates.length > 0) {
                const firstCand = allCandidates[0];
                selectedCandidateId = firstCand.id;
                inspectCandidate(firstCand);
            }
        })
        .catch(err => alert('Delete failed: ' + err.message));
    });

    function updateDecisionButtons(status) {
        if (!btnShortlist || !btnReject) return;
        btnShortlist.classList.remove('active');
        btnReject.classList.remove('active');

        if (status === 'Shortlisted') {
            btnShortlist.classList.add('active');
            if (emailNotificationSection) emailNotificationSection.style.display = 'block';
        } else if (status === 'Rejected') {
            btnReject.classList.add('active');
            if (emailNotificationSection) emailNotificationSection.style.display = 'none';
        } else {
            if (emailNotificationSection) emailNotificationSection.style.display = 'none';
        }
    }

    function handleDecisionClick(targetStatus) {
        if (!selectedCandidateId) return;
        const cand = allCandidates.find(c => c.id === selectedCandidateId);
        if (!cand) return;

        // Toggle back to 'Pending' if clicking already active status
        const newStatus = cand.shortlistStatus === targetStatus ? 'Pending' : targetStatus;

        btnShortlist.disabled = true;
        btnReject.disabled = true;

        fetch(`${API_BASE_URL}/api/candidates/${selectedCandidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shortlist_status: newStatus })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to update decision');
            return res.json();
        })
        .then(() => {
            cand.shortlistStatus = newStatus;
            
            renderAnalytics();
            renderCandidatesDirectory();
            updateDecisionButtons(newStatus);
        })
        .catch(err => {
            alert('Failed to update decision: ' + err.message);
        })
        .finally(() => {
            btnShortlist.disabled = false;
            btnReject.disabled = false;
        });
    }

    if (btnShortlist) {
        btnShortlist.addEventListener('click', () => handleDecisionClick('Shortlisted'));
    }
    if (btnReject) {
        btnReject.addEventListener('click', () => handleDecisionClick('Rejected'));
    }

    if (btnSendEmail) {
        btnSendEmail.addEventListener('click', () => {
            if (!selectedCandidateId) return;
            const emailValue = candidateEmailInput ? candidateEmailInput.value.trim() : '';
            const companyValue = companyNameInput ? companyNameInput.value.trim() : 'NexusNLP';
            if (!emailValue) {
                alert('Please enter a valid email address first.');
                return;
            }

            const btnText = btnSendEmail.querySelector('.btn-text');
            const loader = btnSendEmail.querySelector('.loader');

            btnText.style.display = 'none';
            if (loader) loader.style.display = 'block';
            btnSendEmail.disabled = true;

            if (emailStatusMsg) {
                emailStatusMsg.style.display = 'none';
                emailStatusMsg.textContent = '';
            }

            fetch(`${API_BASE_URL}/api/candidates/${selectedCandidateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: emailValue })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to save email address');
                return res.json();
            })
            .then(() => {
                // Update local cache email
                const cand = allCandidates.find(c => c.id === selectedCandidateId);
                if (cand) {
                    cand.details.email = emailValue;
                    if (inspectedEmail) {
                        inspectedEmail.textContent = `✉ ${emailValue}`;
                    }
                }

                // Call backend send-email endpoint
                return fetch(`${API_BASE_URL}/api/candidates/${selectedCandidateId}/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: emailValue, company: companyValue })
                });
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(errData => {
                        throw new Error(errData.error || 'Failed to send email.');
                    });
                }
                return res.json();
            })
            .then(data => {
                const cand = allCandidates.find(c => c.id === selectedCandidateId);
                if (data.mock) {
                    // SMTP not configured, fallback to Gmail compose URL
                    const candidateName = cand ? cand.name : 'Candidate';
                    const subject = `Shortlist Notification — ${currentJobTitle} Position at ${companyValue}`;
                    const body = `Dear ${candidateName},\n\nWe are pleased to inform you that your resume has been reviewed and you have been shortlisted for the ${currentJobTitle} position at ${companyValue}.\n\nOur recruitment team was highly impressed by your qualifications and experience. We will be in touch with you shortly to schedule the next steps of the interview process.\n\nBest regards,\nRecruitment Team\n${companyValue}`;
                    
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailValue)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    
                    // Open Gmail in a new tab
                    window.open(gmailUrl, '_blank');

                    if (emailStatusMsg) {
                        emailStatusMsg.style.display = 'block';
                        emailStatusMsg.style.color = 'var(--warning)';
                        emailStatusMsg.textContent = 'SMTP not configured in .env. Redirected to Gmail compose window!';
                    }
                } else {
                    if (emailStatusMsg) {
                        emailStatusMsg.style.display = 'block';
                        emailStatusMsg.style.color = 'var(--success)';
                        emailStatusMsg.textContent = 'Email sent successfully via SMTP!';
                    }
                }
            })
            .catch(err => {
                if (emailStatusMsg) {
                    emailStatusMsg.style.display = 'block';
                    emailStatusMsg.style.color = 'var(--danger)';
                    emailStatusMsg.textContent = err.message;
                }
            })
            .finally(() => {
                btnText.style.display = 'block';
                if (loader) loader.style.display = 'none';
                btnSendEmail.disabled = false;
            });
        });
    }

    // --- Bulk Email Modal Logic ---
    if (notifyAllBtn) {
        notifyAllBtn.addEventListener('click', () => {
            const shortlisted = allCandidates.filter(c => c.shortlistStatus === 'Shortlisted');
            if (shortlisted.length === 0) {
                alert('No candidates have been shortlisted.');
                return;
            }

            // Reset modal inputs and progress state
            if (bulkCompanyNameInput) {
                const singleCompany = companyNameInput ? companyNameInput.value.trim() : 'NexusNLP';
                bulkCompanyNameInput.value = singleCompany || 'NexusNLP';
            }
            if (bulkProgressContainer) bulkProgressContainer.style.display = 'none';
            if (bulkProgressBar) bulkProgressBar.style.width = '0%';
            if (bulkProgressPercent) bulkProgressPercent.textContent = '0%';
            
            // Enable controls
            if (bulkSendBtn) {
                bulkSendBtn.disabled = false;
                const btnText = bulkSendBtn.querySelector('.btn-text');
                const loader = bulkSendBtn.querySelector('.loader');
                if (btnText) btnText.style.display = 'block';
                if (loader) loader.style.display = 'none';
            }
            if (bulkCancelBtn) {
                bulkCancelBtn.style.display = 'block';
                bulkCancelBtn.textContent = 'Cancel';
            }
            if (closeModalBtn) closeModalBtn.disabled = false;

            // Fetch SMTP config status
            fetch(`${API_BASE_URL}/api/smtp-status`)
                .then(res => res.json())
                .then(data => {
                    if (data.configured) {
                        modalSmtpBanner.style.background = 'rgba(16, 185, 129, 0.08)';
                        modalSmtpBanner.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                        smtpBannerBadge.textContent = 'SMTP Active';
                        smtpBannerBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                        smtpBannerBadge.style.color = 'var(--success)';
                        smtpBannerText.textContent = `Server: ${data.server} | Sender: ${data.sender}`;
                    } else {
                        modalSmtpBanner.style.background = 'rgba(245, 158, 11, 0.08)';
                        modalSmtpBanner.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                        smtpBannerBadge.textContent = 'Demo Mode';
                        smtpBannerBadge.style.background = 'rgba(245, 158, 11, 0.2)';
                        smtpBannerBadge.style.color = 'var(--warning)';
                        smtpBannerText.textContent = 'SMTP not configured in .env. Emails will be logged to the server console instead.';
                    }
                })
                .catch(err => {
                    console.error('Failed to retrieve SMTP status:', err);
                    smtpBannerBadge.textContent = 'Error';
                    smtpBannerText.textContent = 'Could not verify SMTP status. Will default to DB email settings.';
                });

            // Populate shortlisted candidates
            if (modalCandidatesCount) modalCandidatesCount.textContent = shortlisted.length;
            if (modalCandidatesTbody) {
                modalCandidatesTbody.innerHTML = '';
                shortlisted.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-candidate-id', c.id);
                    tr.innerHTML = `
                        <td style="padding: 0.8rem 0.2rem; border-bottom: 1px solid rgba(249, 115, 22, 0.08);">
                            <div class="modal-candidate-name" style="font-weight: 600; color: var(--text-main);">${c.name}</div>
                            <div class="modal-candidate-filename" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${c.filename}</div>
                        </td>
                        <td style="padding: 0.8rem 0.2rem; border-bottom: 1px solid rgba(249, 115, 22, 0.08);">
                            <input type="email" class="modal-email-input" value="${c.details.email || ''}" placeholder="candidate@example.com" style="background: var(--input-bg) !important; border: 1px solid var(--border-color) !important; color: var(--text-main) !important; padding: 0.4rem 0.8rem !important; border-radius: 8px !important; font-size: 0.9rem !important; width: 95% !important;">
                        </td>
                        <td style="padding: 0.8rem 0.2rem; border-bottom: 1px solid rgba(249, 115, 22, 0.08); text-align: right;">
                            <span class="modal-status-badge modal-status-ready" style="font-size: 0.85rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 6px; display: inline-block; background: rgba(245, 158, 11, 0.1); color: var(--warning);">Ready</span>
                        </td>
                    `;
                    modalCandidatesTbody.appendChild(tr);
                });
            }

            // Display modal
            if (bulkEmailModal) {
                bulkEmailModal.style.display = 'flex';
                bulkEmailModal.style.alignItems = 'center';
                bulkEmailModal.style.justifyContent = 'center';
            }
        });
    }

    function closeModal() {
        if (bulkEmailModal) bulkEmailModal.style.display = 'none';
        fetchScreeningData();
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (bulkCancelBtn) {
        bulkCancelBtn.addEventListener('click', closeModal);
    }

    // Backdrop click close modal
    if (bulkEmailModal) {
        bulkEmailModal.addEventListener('click', (e) => {
            if (e.target === bulkEmailModal) {
                if (bulkSendBtn && !bulkSendBtn.disabled) {
                    closeModal();
                }
            }
        });
    }

    // Send Bulk Emails Handler
    if (bulkSendBtn) {
        bulkSendBtn.addEventListener('click', () => {
            const rows = modalCandidatesTbody.querySelectorAll('tr');
            if (rows.length === 0) return;

            const companyName = bulkCompanyNameInput ? bulkCompanyNameInput.value.trim() : 'NexusNLP';
            
            // Disable UI inputs
            bulkSendBtn.disabled = true;
            const btnText = bulkSendBtn.querySelector('.btn-text');
            const loader = bulkSendBtn.querySelector('.loader');
            if (btnText) btnText.style.display = 'none';
            if (loader) loader.style.display = 'block';
            if (bulkCancelBtn) bulkCancelBtn.style.display = 'none';
            if (closeModalBtn) closeModalBtn.disabled = true;

            const emailInputs = modalCandidatesTbody.querySelectorAll('.modal-email-input');
            emailInputs.forEach(input => input.disabled = true);

            // Update statuses to 'Saving...'
            rows.forEach(row => {
                const badge = row.querySelector('.modal-status-badge');
                if (badge) {
                    badge.textContent = 'Saving...';
                    badge.style.background = 'rgba(249, 115, 22, 0.1)';
                    badge.style.color = 'var(--primary)';
                }
            });

            // Save modified emails first
            const savePromises = [];
            rows.forEach(row => {
                const candidateId = parseInt(row.getAttribute('data-candidate-id'));
                const emailInput = row.querySelector('.modal-email-input');
                const emailValue = emailInput.value.trim();
                
                const cand = allCandidates.find(c => c.id === candidateId);
                if (cand && cand.details.email !== emailValue) {
                    const p = fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: emailValue })
                    }).then(res => {
                        if (res.ok) {
                            cand.details.email = emailValue;
                        }
                    }).catch(err => console.error(`Error saving email for candidate ${candidateId}:`, err));
                    savePromises.push(p);
                }
            });

            Promise.all(savePromises).then(() => {
                // Update badges to 'Sending...'
                rows.forEach(row => {
                    const badge = row.querySelector('.modal-status-badge');
                    if (badge) {
                        badge.textContent = 'Sending...';
                        badge.style.background = 'rgba(249, 115, 22, 0.15)';
                        badge.style.color = 'var(--primary)';
                    }
                });

                if (bulkProgressContainer) bulkProgressContainer.style.display = 'block';
                if (bulkProgressBar) bulkProgressBar.style.width = '20%';
                if (bulkProgressPercent) bulkProgressPercent.textContent = '20%';
                if (bulkProgressLabel) bulkProgressLabel.textContent = 'SMTP queue initialized...';

                // Trigger bulk notify API
                fetch(`${API_BASE_URL}/api/jobs/${jobId}/notify-shortlisted`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ company: companyName })
                })
                .then(res => {
                    if (bulkProgressBar) bulkProgressBar.style.width = '70%';
                    if (bulkProgressPercent) bulkProgressPercent.textContent = '70%';
                    if (bulkProgressLabel) bulkProgressLabel.textContent = 'Processing responses...';
                    
                    if (!res.ok) throw new Error('Failed to run bulk email execution on server.');
                    return res.json();
                })
                .then(data => {
                    const details = data.details || [];
                    rows.forEach(row => {
                        const candidateId = parseInt(row.getAttribute('data-candidate-id'));
                        const badge = row.querySelector('.modal-status-badge');
                        
                        const candResult = details.find(r => r.id === candidateId);
                        if (candResult) {
                            if (candResult.success) {
                                if (candResult.mocked) {
                                    badge.textContent = 'Mocked ✉';
                                    badge.style.background = 'rgba(245, 158, 11, 0.15)';
                                    badge.style.color = 'var(--warning)';
                                    badge.title = 'SMTP not configured. Email logged to server console.';
                                } else {
                                    badge.textContent = 'Sent ✓';
                                    badge.style.background = 'rgba(16, 185, 129, 0.15)';
                                    badge.style.color = 'var(--success)';
                                    badge.title = 'Email sent successfully via SMTP.';
                                }
                            } else {
                                badge.textContent = 'Failed ✗';
                                badge.style.background = 'rgba(239, 68, 68, 0.15)';
                                badge.style.color = 'var(--danger)';
                                badge.style.cursor = 'help';
                                badge.title = candResult.error || 'Unknown sending failure.';
                            }
                        }
                    });

                    if (bulkProgressBar) bulkProgressBar.style.width = '100%';
                    if (bulkProgressPercent) bulkProgressPercent.textContent = '100%';
                    if (bulkProgressLabel) bulkProgressLabel.textContent = 'Finished!';

                    if (details.length > 0 && details[0].mocked) {
                        alert(`Demo Mode: SMTP is not configured.\nEmails were logged to the server console instead of being sent.\nLogged count: ${data.sent_count}`);
                    } else {
                        alert(`Notification process complete.\nSent successfully via SMTP: ${data.sent_count}\nFailed: ${data.failed_count}`);
                    }
                })
                .catch(err => {
                    rows.forEach(row => {
                        const badge = row.querySelector('.modal-status-badge');
                        if (badge) {
                            badge.textContent = 'Error ✗';
                            badge.style.background = 'rgba(239, 68, 68, 0.15)';
                            badge.style.color = 'var(--danger)';
                            badge.title = err.message;
                        }
                    });
                    alert('Bulk notification failed: ' + err.message);
                })
                .finally(() => {
                    if (bulkSendBtn) {
                        bulkSendBtn.disabled = false;
                        if (btnText) btnText.style.display = 'block';
                        if (loader) loader.style.display = 'none';
                    }
                    if (bulkCancelBtn) {
                        bulkCancelBtn.style.display = 'block';
                        bulkCancelBtn.textContent = 'Close';
                    }
                    if (closeModalBtn) closeModalBtn.disabled = false;
                });
            });
        });
    }

    function renderAnalytics() {
        const total = allCandidates.length;
        const shortlisted = allCandidates.filter(c => c.shortlistStatus === 'Shortlisted').length;
        const rejected = allCandidates.filter(c => c.shortlistStatus === 'Rejected').length;
        const pending = total - shortlisted - rejected;

        const statTotal = document.getElementById('stat-total');
        const statShortlisted = document.getElementById('stat-shortlisted');
        const statRejected = document.getElementById('stat-rejected');
        
        const legendShort = document.getElementById('legend-shortlisted');
        const legendPend = document.getElementById('legend-pending');
        const legendRej = document.getElementById('legend-rejected');

        if (statTotal) statTotal.textContent = total;
        if (statShortlisted) statShortlisted.textContent = shortlisted;
        if (statRejected) statRejected.textContent = rejected;

        if (btnShortlistCount) btnShortlistCount.textContent = shortlisted;
        if (notifyAllBtn) {
            notifyAllBtn.disabled = shortlisted === 0;
            if (shortlisted === 0) {
                notifyAllBtn.style.opacity = '0.5';
                notifyAllBtn.style.cursor = 'not-allowed';
            } else {
                notifyAllBtn.style.opacity = '1';
                notifyAllBtn.style.cursor = 'pointer';
            }
        }

        if (legendShort) legendShort.textContent = shortlisted;
        if (legendPend) legendPend.textContent = pending;
        if (legendRej) legendRej.textContent = rejected;

        const ratio = total > 0 ? Math.round((shortlisted / total) * 100) : 0;
        const donutPct = document.getElementById('donut-percentage');
        if (donutPct) donutPct.textContent = `${ratio}%`;

        const segmentShort = document.getElementById('donut-segment-shortlisted');
        const segmentPending = document.getElementById('donut-segment-pending');
        const segmentRejected = document.getElementById('donut-segment-rejected');

        if (segmentShort && segmentPending && segmentRejected) {
            if (total > 0) {
                const sPct = (shortlisted / total) * 100;
                const pPct = (pending / total) * 100;
                const rPct = (rejected / total) * 100;

                segmentShort.setAttribute('stroke-dasharray', `${sPct} 100`);
                segmentShort.setAttribute('stroke-dashoffset', '0');

                segmentPending.setAttribute('stroke-dasharray', `${pPct} 100`);
                segmentPending.setAttribute('stroke-dashoffset', `-${sPct}`);

                segmentRejected.setAttribute('stroke-dasharray', `${rPct} 100`);
                segmentRejected.setAttribute('stroke-dashoffset', `-${sPct + pPct}`);
            } else {
                segmentShort.setAttribute('stroke-dasharray', '0 100');
                segmentPending.setAttribute('stroke-dasharray', '100 100');
                segmentPending.setAttribute('stroke-dashoffset', '0');
                segmentRejected.setAttribute('stroke-dasharray', '0 100');
            }
        }
    }


    // Render Candidates Directory List
    function renderCandidatesDirectory() {
        const filtered = allCandidates.filter(c => {
            // Status match
            let matchesFilter = false;
            if (activeFilter === 'all') {
                matchesFilter = true;
            } else if (activeFilter === 'Excellent Match' || activeFilter === 'Good Match') {
                matchesFilter = c.status === activeFilter;
            } else if (activeFilter === 'Average/Low Match') {
                matchesFilter = c.status === 'Average Match' || c.status === 'Low Match';
            }

            // Search match (name, filename, or skills)
            let matchesSearch = true;
            if (searchQuery) {
                const nameMatch = c.name.toLowerCase().includes(searchQuery);
                const skillMatch = c.details.matchedSkills.some(s => s.toLowerCase().includes(searchQuery));
                const filenameMatch = c.filename.toLowerCase().includes(searchQuery);
                matchesSearch = nameMatch || skillMatch || filenameMatch;
            }

            return matchesFilter && matchesSearch;
        });

        // Rebuild rows
        candidatesListTbody.innerHTML = '';
        if (filtered.length === 0) {
            noCandidatesMessage.style.display = 'block';
        } else {
            noCandidatesMessage.style.display = 'none';
            filtered.forEach(c => {
                const tr = document.createElement('tr');
                tr.className = `candidate-row ${selectedCandidateId === c.id ? 'active' : ''}`;
                tr.setAttribute('data-id', c.id);
                
                const badgeClass = c.status.toLowerCase().replace(' ', '-');

                let statusIcon = '';
                if (c.shortlistStatus === 'Shortlisted') {
                    statusIcon = `<span class="indicator-badge indicator-shortlisted" title="Shortlisted">✓</span>`;
                } else if (c.shortlistStatus === 'Rejected') {
                    statusIcon = `<span class="indicator-badge indicator-rejected" title="Rejected">✗</span>`;
                }

                tr.innerHTML = `
                    <td style="text-align: center;"><strong>#${c.rank}</strong></td>
                    <td>
                        <div class="candidate-row-name" style="display: flex; align-items: center; gap: 0.5rem;">
                            ${c.name} ${statusIcon}
                        </div>
                        <div class="candidate-row-filename">${c.filename}</div>
                    </td>
                    <td style="text-align: center;"><strong>${c.overallScore}%</strong></td>
                    <td style="text-align: right;">
                        <span class="status-pill status-${badgeClass}">${c.status}</span>
                    </td>
                `;

                tr.addEventListener('click', () => {
                    selectedCandidateId = c.id;
                    document.querySelectorAll('.candidate-row').forEach(row => row.classList.remove('active'));
                    tr.classList.add('active');
                    inspectCandidate(c);
                });

                candidatesListTbody.appendChild(tr);
            });
        }
    }

    // Inspect Candidate Detail Panel
    let animationInterval = null;
    function inspectCandidate(c) {
        if (animationInterval) clearInterval(animationInterval);

        emptyInspection.style.display = 'none';
        inspectionDetails.style.display = 'block';

        // Reset tab view to Overview on new candidate selection
        resetTabs();

        // Update Matplotlib visual chart
        const inspectedChart = document.getElementById('inspected-chart');
        if (inspectedChart) {
            const isDark = document.documentElement.classList.contains('dark-theme');
            const themeParam = isDark ? 'dark' : 'light';
            inspectedChart.src = `${API_BASE_URL}/api/candidates/${c.id}/chart.png?theme=${themeParam}&t=${new Date().getTime()}`;
        }

        // Update View Original Resume link
        const viewResumeBtn = document.getElementById('btn-view-resume');
        if (viewResumeBtn) {
            viewResumeBtn.href = `${API_BASE_URL}/api/candidates/${c.id}/resume`;
        }

        // Select candidate row visually
        document.querySelectorAll('.candidate-row').forEach(row => {
            if (parseInt(row.getAttribute('data-id')) === c.id) {
                row.classList.add('active');
            } else {
                row.classList.remove('active');
            }
        });

        // Set text
        document.getElementById('inspected-name').textContent = c.name;
        document.getElementById('inspected-filename').textContent = c.filename;
        if (inspectedEmail) {
            inspectedEmail.textContent = c.details.email ? `✉ ${c.details.email}` : '✉ No email found';
        }
        if (candidateEmailInput) {
            candidateEmailInput.value = c.details.email || '';
        }
        if (emailStatusMsg) {
            emailStatusMsg.style.display = 'none';
            emailStatusMsg.textContent = '';
        }
        candidateNotes.value = c.details.notes || '';
        document.getElementById('inspected-summary').textContent = c.details.summary || 'Summary not available.';
        
        // Update Shortlist/Reject Buttons active state
        updateDecisionButtons(c.shortlistStatus || 'Pending');
        
        // Overall match circle
        const circle = document.getElementById('score-circle-path');
        const scoreText = document.getElementById('score-text');
        const scoreStatus = document.getElementById('score-status');
        const score = c.overallScore;

        circle.setAttribute('stroke-dasharray', '0, 100');
        setTimeout(() => {
            circle.setAttribute('stroke-dasharray', `${score}, 100`);
            
            if (score >= 85) {
                circle.style.stroke = '#10b981'; // Green
                scoreStatus.style.color = '#10b981';
            } else if (score >= 70) {
                circle.style.stroke = '#f59e0b'; // Amber
                scoreStatus.style.color = '#f59e0b';
            } else if (score >= 50) {
                circle.style.stroke = '#fb923c'; // Orange
                scoreStatus.style.color = '#fb923c';
            } else {
                circle.style.stroke = '#ef4444'; // Red
                scoreStatus.style.color = '#ef4444';
            }
            scoreStatus.textContent = c.status;
        }, 100);

        // Score counter text animation
        let currentScore = 0;
        animationInterval = setInterval(() => {
            if (currentScore >= Math.floor(score)) {
                clearInterval(animationInterval);
                scoreText.textContent = `${score}%`;
            } else {
                currentScore++;
                scoreText.textContent = `${currentScore}%`;
            }
        }, 12);

        // Progress bars
        const metrics = [
            { key: 'skillsMatch' },
            { key: 'projectRelevance' },
            { key: 'experienceCheck' },
            { key: 'cgpaRequirement' }
        ];

        const progressBars = inspectionDetails.querySelectorAll('.progress');
        const metricLabels = inspectionDetails.querySelectorAll('.metric-label');

        metrics.forEach((metric, index) => {
            const val = c.metrics[metric.key];
            const bar = progressBars[index];
            const labelSpan = metricLabels[index];
            
            const valueSpan = labelSpan.querySelector('.metric-value');
            if (valueSpan) {
                valueSpan.textContent = `${val}%`;
            }

            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = `${val}%`;
                if (val >= 80) {
                    bar.classList.add('progress-success');
                } else {
                    bar.classList.remove('progress-success');
                }
            }, 250);
        });

        // Update Radar Spider Chart
        const s1 = c.metrics.skillsMatch;
        const s2 = c.metrics.projectRelevance;
        const s3 = c.metrics.experienceCheck;
        const s4 = c.metrics.cgpaRequirement;

        const radarPoly = document.getElementById('radar-polygon');
        const dotSkills = document.getElementById('radar-dot-skills');
        const dotRelevance = document.getElementById('radar-dot-relevance');
        const dotExp = document.getElementById('radar-dot-exp');
        const dotCgpa = document.getElementById('radar-dot-cgpa');

        if (radarPoly && dotSkills && dotRelevance && dotExp && dotCgpa) {
            const p1 = `60,${60 - 0.4 * s1}`;
            const p2 = `${60 + 0.4 * s2},60`;
            const p3 = `60,${60 + 0.4 * s3}`;
            const p4 = `${60 - 0.4 * s4},60`;
            
            radarPoly.setAttribute('points', `${p1} ${p2} ${p3} ${p4}`);
            
            dotSkills.setAttribute('cy', 60 - 0.4 * s1);
            dotRelevance.setAttribute('cx', 60 + 0.4 * s2);
            dotExp.setAttribute('cy', 60 + 0.4 * s3);
            dotCgpa.setAttribute('cx', 60 - 0.4 * s4);
        }

        // Skills lists tags
        const skillsContainer = document.getElementById('skills-list-container');
        skillsContainer.innerHTML = '';
        const tagList = document.createElement('div');
        tagList.className = 'tag-list';

        c.details.matchedSkills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'tag tag-matched';
            span.textContent = `✓ ${skill}`;
            tagList.appendChild(span);
        });

        c.details.missingSkills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'tag tag-missing';
            span.textContent = `✗ ${skill}`;
            tagList.appendChild(span);
        });

        if (c.details.matchedSkills.length === 0 && c.details.missingSkills.length === 0) {
            skillsContainer.innerHTML = '<p class="upload-hint">No skills specified.</p>';
        } else {
            skillsContainer.appendChild(tagList);
        }

        // Requirements details list
        const reqContainer = document.getElementById('requirements-list-container');
        reqContainer.innerHTML = '';

        // Experience Row
        const expRow = document.createElement('div');
        expRow.className = 'requirement-row';
        expRow.innerHTML = `
            <span class="req-label">Work Experience</span>
            <span class="req-value">Extracted: ${c.details.extractedExperience} yrs (Min required: ${c.details.minExperience} yrs)</span>
        `;
        reqContainer.appendChild(expRow);

        // CGPA Row
        const cgpaRow = document.createElement('div');
        cgpaRow.className = 'requirement-row';
        cgpaRow.innerHTML = `
            <span class="req-label">CGPA / Grade</span>
            <span class="req-value">Extracted: ${c.details.extractedCgpa} (Min required: ${c.details.minCgpa || 'N/A'})</span>
        `;
        reqContainer.appendChild(cgpaRow);
    }
});
