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

    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const fileDisplayList = document.getElementById('file-display-list');
    const fileCountSummary = document.getElementById('file-count-summary');
    const fileItemsContainer = document.getElementById('file-items-container');
    const clearAllFilesBtn = document.getElementById('clear-all-files');
    const analyzeBtn = document.getElementById('analyze-btn');

    let uploadedFiles = [];

    // Job templates definition
    const JOB_TEMPLATES = {
        software_engineer: {
            title: "Software Engineer",
            skills: "Python, JavaScript, Git, SQL, React, Node.js",
            minCgpa: "7.0",
            minExperience: "2",
            jobDesc: "We are seeking a Software Engineer to develop, test, and deploy software applications. Key duties include writing clean, clean-coded programs, database management, and designing front-end/back-end features. Requirements: BS/MS in Computer Science or similar, coding proficiency in programming languages."
        },
        doctor: {
            title: "General Physician / Doctor",
            skills: "Diagnostics, Patient Care, Clinical Medicine, Pharmacology, EMR",
            minCgpa: "8.0",
            minExperience: "3",
            jobDesc: "We are looking for a dedicated General Physician to examine patients, diagnose illnesses, prescribe medication, and advise on preventative health. Candidates must possess a valid Medical License, strong communication skills, and expertise in clinical diagnostics."
        },
        nurse: {
            title: "Registered Nurse (RN)",
            skills: "Patient Care, Vital Signs, First Aid, CPR, Medication Administration, Empathy",
            minCgpa: "6.5",
            minExperience: "1",
            jobDesc: "Seeking a compassionate Registered Nurse to monitor patient health, administer medications, assist doctors during examinations, maintain records, and counsel patients and families on post-treatment care. Must have valid nursing credentials and excellent caregiving skills."
        },
        lawyer: {
            title: "Legal Counsel / Lawyer",
            skills: "Legal Research, Contract Drafting, Litigation, Negotiation, Verbal Communication",
            minCgpa: "7.5",
            minExperience: "4",
            jobDesc: "We are hiring a Legal Counsel to represent clients, research legal issues, draft legal documents (contracts, briefs, deeds), and present cases in court. Must have a valid Bar license, outstanding analytical abilities, and strong bargaining/negotiation skills."
        },
        data_scientist: {
            title: "Data Scientist",
            skills: "Python, Machine Learning, Statistics, SQL, Pandas, Tableau",
            minCgpa: "7.5",
            minExperience: "2",
            jobDesc: "Seeking a Data Scientist to analyze complex datasets, build machine learning models, and derive actionable insights. Key responsibilities include data cleaning, statistical modeling, and presenting data visualizations to stakeholders. Master's or BS in Statistics/CS preferred."
        },
        custom: {
            title: "",
            skills: "",
            minCgpa: "",
            minExperience: "",
            jobDesc: ""
        }
    };

    function applyJobTemplate(templateKey) {
        const template = JOB_TEMPLATES[templateKey];
        if (!template) return;

        document.getElementById('job-title').value = template.title;
        document.getElementById('skills').value = template.skills;
        document.getElementById('min-cgpa').value = template.minCgpa;
        document.getElementById('experience').value = template.minExperience;
        document.getElementById('job-desc').value = template.jobDesc;

        // Visual feedback for selected card
        document.querySelectorAll('.template-card').forEach(card => {
            if (card.getAttribute('data-template') === templateKey) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    // Set up template card click handlers
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateKey = card.getAttribute('data-template');
            applyJobTemplate(templateKey);
        });
    });

    // Default to Software Engineer on load
    applyJobTemplate('software_engineer');


    // Fetch and populate past screenings history
    fetchHistory();

    function fetchHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        fetch(`${API_BASE_URL}/api/jobs`)
            .then(res => res.json())
            .then(jobs => {
                if (!jobs || jobs.length === 0) {
                    historyList.innerHTML = '<div class="empty-history">No past screenings found.</div>';
                    return;
                }
                historyList.innerHTML = '';
                jobs.forEach(job => {
                    const date = new Date(job.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <div class="history-info">
                            <div class="history-title">${escapeHTML(job.title || 'Untitled Session')}</div>
                            <div class="history-meta">${job.candidateCount} candidate${job.candidateCount !== 1 ? 's' : ''} • ${date}</div>
                        </div>
                        <button class="delete-history-btn" data-id="${job.id}" title="Delete Screening Session">✕</button>
                    `;
                    
                    // Click history info to open details
                    item.querySelector('.history-info').addEventListener('click', () => {
                        window.location.href = `dashboard.html?jobId=${job.id}`;
                    });
                    
                    historyList.appendChild(item);
                });
                
                // Add delete listeners
                historyList.querySelectorAll('.delete-history-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = btn.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this screening session and all its candidates?')) {
                            deleteSession(id);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Failed to load history:', err);
                historyList.innerHTML = '<div class="empty-history text-error">Failed to load history.</div>';
            });
    }

    function deleteSession(id) {
        fetch(`${API_BASE_URL}/api/jobs/${id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete');
            fetchHistory();
        })
        .catch(err => alert('Delete failed: ' + err.message));
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
    });

    uploadArea.addEventListener('drop', handleDrop, false);
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    clearAllFilesBtn.addEventListener('click', clearAllFiles);
    analyzeBtn.addEventListener('click', analyzeResumes);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        addFiles(files);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        addFiles(files);
    }

    // (Remaining functions: addFiles, updateFileDisplay, removeFile, clearAllFiles)
    function addFiles(files) {
        const validFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg'].includes(ext);
        });

        if (validFiles.length < files.length) {
            alert('Some files were ignored. Supported formats: PDF, DOCX, TXT, PNG, JPG, JPEG.');
        }

        if (uploadedFiles.length + validFiles.length > 100) {
            alert('You can upload a maximum of 100 resumes at the same time.');
            const sliceSize = 100 - uploadedFiles.length;
            uploadedFiles = uploadedFiles.concat(validFiles.slice(0, sliceSize));
        } else {
            uploadedFiles = uploadedFiles.concat(validFiles);
        }

        fileInput.value = ''; 
        updateFileDisplay();
    }

    function updateFileDisplay() {
        if (uploadedFiles.length === 0) {
            uploadArea.style.display = 'block';
            fileDisplayList.style.display = 'none';
            analyzeBtn.disabled = true;
        } else {
            uploadArea.style.display = 'none';
            fileDisplayList.style.display = 'block';
            analyzeBtn.disabled = false;
            
            fileCountSummary.textContent = `${uploadedFiles.length} resume${uploadedFiles.length > 1 ? 's' : ''} selected`;
            
            fileItemsContainer.innerHTML = '';
            uploadedFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                
                const ext = file.name.split('.').pop().toLowerCase();
                let iconColor = '#ef4444'; 
                if (ext === 'docx') iconColor = '#3b82f6'; 
                if (ext === 'txt') iconColor = '#6b7280'; 
                if (['png', 'jpg', 'jpeg'].includes(ext)) iconColor = '#8b5cf6'; 

                item.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" style="margin-right: 0.8rem; flex-shrink: 0;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span class="file-item-name" title="${file.name}">${file.name}</span>
                    <button class="remove-item-btn" data-index="${index}">✕</button>
                `;
                
                fileItemsContainer.appendChild(item);
            });

            const removeButtons = fileItemsContainer.querySelectorAll('.remove-item-btn');
            removeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.getAttribute('data-index'));
                    removeFile(index);
                });
            });
        }
    }

    function removeFile(index) {
        uploadedFiles.splice(index, 1);
        updateFileDisplay();
    }

    function clearAllFiles() {
        uploadedFiles = [];
        updateFileDisplay();
    }

    function analyzeResumes() {
        const btnText = analyzeBtn.querySelector('.btn-text');
        const loader = analyzeBtn.querySelector('.loader');

        btnText.style.display = 'none';
        loader.style.display = 'block';
        analyzeBtn.disabled = true;

        const jobTitle = document.getElementById('job-title').value;
        const skills = document.getElementById('skills').value;
        const minCgpa = document.getElementById('min-cgpa').value;
        const minExperience = document.getElementById('experience').value;
        const jobDesc = document.getElementById('job-desc').value;

        const formData = new FormData();
        uploadedFiles.forEach(file => {
            formData.append('resumes', file);
        });
        formData.append('jobTitle', jobTitle);
        formData.append('skills', skills);
        formData.append('minCgpa', minCgpa);
        formData.append('minExperience', minExperience);
        formData.append('jobDesc', jobDesc);

        fetch(`${API_BASE_URL}/analyze_bulk`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Server error'); });
            }
            return response.json();
        })
        .then(data => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
            
            // Redirect using the database jobId response
            window.location.href = `dashboard.html?jobId=${data.jobId}`;
        })
        .catch(err => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
            alert('Analysis failed: ' + err.message);
        });
    }
});
