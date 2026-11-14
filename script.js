const SHEETDB_URL = 'https://sheetdb.io/api/v1/we4xt4xy0052m';
const DRIVE_UPLOAD_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyRjrNsagkCG_TfiyhKwrerXu9JPoEg7NvLF5pO1LjyQqRYcCcmkIjKZNsCpWW5-fI4/exec';

let selectedResumeFile = null;
let localResumeBlobUrl = null;

// Set and lock today's date in DD/MM/YYYY format
function setTodaySubmissionDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateField = document.getElementById('formSubmissionDate');
    if (dateField) {
        dateField.value = `${dd}/${mm}/${yyyy}`;
    }
}

// Convert YYYY-MM-DD (from native calendar input) to DD/MM/YYYY for Google Sheet
function formatCalendarDate(isoDateStr) {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Auto-fill today's locked date immediately on load
    setTodaySubmissionDate();

    // Generic word counter & limiter for all word-limited textareas
    const limitedAreas = document.querySelectorAll('.word-limited');
    limitedAreas.forEach(area => {
        area.addEventListener('input', function () {
            const maxWords = parseInt(this.getAttribute('data-max'), 10);
            const counterId = this.getAttribute('data-counter');
            const counterEl = document.getElementById(counterId);
            const text = this.value.trim();
            const words = text ? text.split(/\s+/) : [];

            if (words.length > maxWords) {
                this.value = words.slice(0, maxWords).join(' ');
                if (counterEl) {
                    counterEl.textContent = `${maxWords} / ${maxWords} words (Maximum reached)`;
                    counterEl.classList.add('limit-exceeded');
                }
            } else {
                if (counterEl) {
                    counterEl.textContent = `${words.length} / ${maxWords} words`;
                    counterEl.classList.remove('limit-exceeded');
                }
            }
        });
    });

    // Resume File Input & Drag-and-Drop Handlers
    const resumeInput = document.getElementById('resumeFile');
    const dropzone = document.getElementById('resumeDropzone');

    resumeInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleResumeSelection(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            resumeInput.files = e.dataTransfer.files;
            handleResumeSelection(e.dataTransfer.files[0]);
        }
    });
});

// Handle Resume Selection & Local Preview/Download Setup
function handleResumeSelection(file) {
    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
        alert('File size exceeds 10 MB. Please upload a smaller resume file.');
        clearResume();
        return;
    }

    selectedResumeFile = file;
    if (localResumeBlobUrl) {
        URL.revokeObjectURL(localResumeBlobUrl);
    }
    localResumeBlobUrl = URL.createObjectURL(file);

    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE';
    const sizeKB = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    document.getElementById('resumeFileExt').innerText = ext;
    document.getElementById('resumeFileName').innerText = file.name;
    document.getElementById('resumeFileSize').innerText = sizeKB;
    document.getElementById('resumePreviewCard').classList.remove('hidden');
}

// Preview Uploaded Resume (Inline PDF/TXT Viewer or Word Document Summary Modal)
function previewResume() {
    if (!localResumeBlobUrl || !selectedResumeFile) return;

    const modal = document.getElementById('resumeViewerModal');
    const body = document.getElementById('viewerModalBody');
    const title = document.getElementById('viewerModalTitle');
    const ext = selectedResumeFile.name.split('.').pop().toLowerCase();

    title.innerText = selectedResumeFile.name;
    body.innerHTML = '';

    if (ext === 'pdf' || ext === 'txt') {
        const iframe = document.createElement('iframe');
        iframe.src = localResumeBlobUrl;
        body.appendChild(iframe);
    } else {
        body.innerHTML = `
            <div class="viewer-doc-fallback">
                <i class="fa-solid fa-file-word" style="font-size: 42px; color: #4a6da7;"></i>
                <h4 style="margin: 12px 0 4px 0; color: #1e293b;">${escapeHtml(selectedResumeFile.name)}</h4>
                <p>Word documents (.${escapeHtml(ext)}) are ready for submission. Click Download below to open it in MS Word.</p>
                <button type="button" class="btn-download" onclick="downloadLocalResume()"><i class="fa-solid fa-download"></i> Download File</button>
            </div>
        `;
    }

    modal.classList.remove('hidden');
}

function closeResumeModal(event) {
    if (event.target.id === 'resumeViewerModal') {
        forceCloseResumeModal();
    }
}

function forceCloseResumeModal() {
    document.getElementById('resumeViewerModal').classList.add('hidden');
    document.getElementById('viewerModalBody').innerHTML = '';
}

// Download Resume Locally for Candidate Verification
function downloadLocalResume() {
    if (!localResumeBlobUrl || !selectedResumeFile) return;
    const a = document.createElement('a');
    a.href = localResumeBlobUrl;
    a.download = selectedResumeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Clear Selected Resume
function clearResume() {
    selectedResumeFile = null;
    if (localResumeBlobUrl) {
        URL.revokeObjectURL(localResumeBlobUrl);
        localResumeBlobUrl = null;
    }
    document.getElementById('resumeFile').value = '';
    document.getElementById('resumePreviewCard').classList.add('hidden');
}

// Convert File to Base64 & Upload Permanently to Your Google Drive Folder
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function uploadResumeToGoogleDrive(file, candidateName) {
    const base64Data = await fileToBase64(file);
    const safePrefix = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const taggedFileName = `${safePrefix}_${file.name}`;

    const response = await fetch(DRIVE_UPLOAD_WEBAPP_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
            fileName: taggedFileName,
            mimeType: file.type || 'application/octet-stream',
            base64: base64Data
        })
    });

    if (!response.ok) {
        throw new Error(`Drive upload failed (HTTP ${response.status}).`);
    }

    const textResponse = await response.text();
    let result;
    try {
        result = JSON.parse(textResponse);
    } catch (parseErr) {
        throw new Error('Unexpected response from Google Apps Script. Verify Web App access is set to "Anyone".');
    }

    if (result && result.status === 'success' && result.downloadUrl) {
        return result.downloadUrl;
    }
    throw new Error(result.message || 'Failed to save resume to Google Drive.');
}

// City Dropdown / Custom Input Handler
function handleCityChange(selectedCity) {
    const delhiContainer = document.getElementById('delhiSubContainer');
    const delhiSelect = document.getElementById('delhiSubCity');
    const otherContainer = document.getElementById('otherCityContainer');
    const otherInput = document.getElementById('otherCityInput');

    if (selectedCity === 'Delhi NCR') {
        delhiContainer.classList.remove('hidden');
        delhiSelect.required = true;
        otherContainer.classList.add('hidden');
        otherInput.required = false;
        otherInput.value = '';
    } else if (selectedCity === 'Other') {
        otherContainer.classList.remove('hidden');
        otherInput.required = true;
        delhiContainer.classList.add('hidden');
        delhiSelect.required = false;
        delhiSelect.value = '';
    } else {
        delhiContainer.classList.add('hidden');
        delhiSelect.required = false;
        delhiSelect.value = '';
        otherContainer.classList.add('hidden');
        otherInput.required = false;
        otherInput.value = '';
    }
}

// Dynamic Extra Education Logic
let eduCount = 0;
function addEduBlock() {
    if (eduCount < 2) {
        eduCount++;
        document.getElementById(`extraEduBlock${eduCount}`).classList.remove('hidden');
        if (eduCount === 2) {
            document.getElementById('addEduBtn').style.display = 'none';
        }
    }
}
function removeEduBlock(num) {
    document.getElementById(`extraEduBlock${num}`).classList.add('hidden');
    document.getElementById(`extraDegreeName${num}`).value = '';
    document.getElementById(`extraDegreeSpec${num}`).value = '';
    document.getElementById(`extraDegreeYear${num}`).value = '';
    document.getElementById(`extraDegreeScore${num}`).value = '';
    eduCount--;
    document.getElementById('addEduBtn').style.display = 'inline-block';
}

// Dynamic Certifications Logic
let certCount = 1;
function addCertBlock() {
    if (certCount < 3) {
        certCount++;
        document.getElementById(`certBlock${certCount}`).classList.remove('hidden');
        if (certCount === 3) {
            document.getElementById('addCertBtn').style.display = 'none';
        }
    }
}
function removeCertBlock(num) {
    document.getElementById(`certBlock${num}`).classList.add('hidden');
    document.getElementById(`certName${num}`).value = '';
    document.getElementById(`certDuration${num}`).value = '';
    document.getElementById(`certYear${num}`).value = '';
    certCount--;
    document.getElementById('addCertBtn').style.display = 'inline-block';
}

// Dynamic Employment Logic
let empCount = 1;
function addEmpBlock() {
    if (empCount < 3) {
        empCount++;
        document.getElementById(`empBlock${empCount}`).classList.remove('hidden');
        if (empCount === 3) {
            document.getElementById('addEmpBtn').style.display = 'none';
        }
    }
}
function removeEmpBlock(num) {
    document.getElementById(`empBlock${num}`).classList.add('hidden');
    document.getElementById(`companyName${num}`).value = '';
    document.getElementById(`jobTitle${num}`).value = '';
    document.getElementById(`startDate${num}`).value = '';
    document.getElementById(`endDate${num}`).value = '';
    document.getElementById(`jobDesc${num}`).value = '';
    const counter = document.getElementById(`jdCounter${num}`);
    if (counter) {
        counter.textContent = '0 / 300 words';
        counter.classList.remove('limit-exceeded');
    }
    empCount--;
    document.getElementById('addEmpBtn').style.display = 'inline-block';
}

function toggleEndDate(checkbox, targetId) {
    const endDateInput = document.getElementById(targetId);
    if (checkbox.checked) {
        endDateInput.value = '';
        endDateInput.disabled = true;
    } else {
        endDateInput.disabled = false;
    }
}

const form = document.getElementById('candidateForm');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('status-message');

form.addEventListener('submit', async e => {
    e.preventDefault();

    // Ensure today's submission date is locked to current date
    setTodaySubmissionDate();

    if (!selectedResumeFile) {
        statusMsg.className = 'status-box error';
        statusMsg.innerText = 'Please attach your Resume / CV before submitting.';
        statusMsg.style.display = 'block';
        return;
    }

    // Activate loading button state until data is successfully sent to SheetDB
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting & Saving Data...`;
    statusMsg.style.display = 'none';

    const fullName = document.getElementById('fullName').value.trim();
    const candidateFirstName = fullName.split(' ')[0] || 'Candidate';

    try {
        // 1. Upload resume permanently to Google Drive & get direct auto-download URL
        const resumeDownloadUrl = await uploadResumeToGoogleDrive(selectedResumeFile, fullName);

        // 2. Build payload for Google Sheet (converting native calendar YYYY-MM-DD to DD/MM/YYYY)
        const dataObj = {
            formSubmissionDate: document.getElementById('formSubmissionDate').value.trim(),
            fullName: fullName,
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            dob: formatCalendarDate(document.getElementById('dob').value),
            nativePlace: document.getElementById('nativePlace').value.trim(),
            city: getCityValue(),

            // Education
            edu10thYear: document.getElementById('edu10thYear').value,
            edu10thScore: document.getElementById('edu10thScore').value.trim(),
            edu12thYear: document.getElementById('edu12thYear').value,
            edu12thScore: document.getElementById('edu12thScore').value.trim(),
            degreeName: document.getElementById('degreeName').value.trim(),
            degreeSpec: document.getElementById('degreeSpec').value.trim(),
            degreeYear: document.getElementById('degreeYear').value,
            degreeScore: document.getElementById('degreeScore').value.trim(),
            pgName: document.getElementById('pgName').value.trim(),
            pgSpec: document.getElementById('pgSpec').value.trim(),
            pgYear: document.getElementById('pgYear').value,
            pgScore: document.getElementById('pgScore').value.trim(),

            // Extra Degrees
            extraDegreeName1: document.getElementById('extraDegreeName1').value.trim(),
            extraDegreeSpec1: document.getElementById('extraDegreeSpec1').value.trim(),
            extraDegreeYear1: document.getElementById('extraDegreeYear1').value,
            extraDegreeScore1: document.getElementById('extraDegreeScore1').value.trim(),
            extraDegreeName2: document.getElementById('extraDegreeName2').value.trim(),
            extraDegreeSpec2: document.getElementById('extraDegreeSpec2').value.trim(),
            extraDegreeYear2: document.getElementById('extraDegreeYear2').value,
            extraDegreeScore2: document.getElementById('extraDegreeScore2').value.trim(),

            // Certifications
            certName1: document.getElementById('certName1').value.trim(),
            certDuration1: document.getElementById('certDuration1').value,
            certYear1: document.getElementById('certYear1').value,
            certName2: document.getElementById('certName2').value.trim(),
            certDuration2: document.getElementById('certDuration2').value,
            certYear2: document.getElementById('certYear2').value,
            certName3: document.getElementById('certName3').value.trim(),
            certDuration3: document.getElementById('certDuration3').value,
            certYear3: document.getElementById('certYear3').value,

            // Employment (with JDs)
            companyName1: document.getElementById('companyName1').value.trim(),
            jobTitle1: document.getElementById('jobTitle1').value.trim(),
            startDate1: formatCalendarDate(document.getElementById('startDate1').value),
            endDate1: document.getElementById('currentlyWorking1').checked ? 'Present' : formatCalendarDate(document.getElementById('endDate1').value),
            jobDesc1: document.getElementById('jobDesc1').value.trim(),

            companyName2: document.getElementById('companyName2').value.trim(),
            jobTitle2: document.getElementById('jobTitle2').value.trim(),
            startDate2: formatCalendarDate(document.getElementById('startDate2').value),
            endDate2: formatCalendarDate(document.getElementById('endDate2').value),
            jobDesc2: document.getElementById('jobDesc2').value.trim(),

            companyName3: document.getElementById('companyName3').value.trim(),
            jobTitle3: document.getElementById('jobTitle3').value.trim(),
            startDate3: formatCalendarDate(document.getElementById('startDate3').value),
            endDate3: formatCalendarDate(document.getElementById('endDate3').value),
            jobDesc3: document.getElementById('jobDesc3').value.trim(),

            // Skills, Sales & Telecalling, Availability, Feedback & Permanent Drive Download Link
            channels: getCheckedValues('channels'),
            channelDetails: document.getElementById('channelDetails').value.trim(),
            salesTelecalling: getCheckedValues('salesTelecalling'),
            expectedJoiningDate: formatCalendarDate(document.getElementById('expectedJoiningDate').value),
            noticePeriodDetails: document.getElementById('noticePeriodDetails').value.trim(),
            orgContribution: document.getElementById('orgContribution').value.trim(),
            openFeedback: document.getElementById('openFeedback').value.trim(),
            languages: getFormattedLanguages(),
            resumeLink: resumeDownloadUrl
        };

        // 3. Send all data + permanent auto-download Drive link to SheetDB
        const sheetRes = await fetch(SHEETDB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [dataObj] })
        });
        await sheetRes.json();

        // 4. Show Personalized Confirmation Card with Zooming Checkmark Icon and Updated Text
        statusMsg.className = 'status-box success-card';
        statusMsg.innerHTML = `
            <i class="fa-solid fa-circle-check status-icon"></i>
            <h3>All the Best, ${escapeHtml(candidateFirstName)}!</h3>
            <p>Thank you for taking the time to complete your application. We're glad to have you take this step towards joining our team.</p>
            <p>Wishing you the very best for your future and success in your career journey!</p>
        `;
        statusMsg.style.display = 'block';
        statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Reset form, restore today's locked date, and clear resume preview
        form.reset();
        setTodaySubmissionDate();
        clearResume();
        document.querySelectorAll('.word-limited').forEach(area => {
            const max = area.getAttribute('data-max');
            const counter = document.getElementById(area.getAttribute('data-counter'));
            if (counter) {
                counter.textContent = `0 / ${max} words`;
                counter.classList.remove('limit-exceeded');
            }
        });
        handleCityChange('');
    } catch (err) {
        statusMsg.className = 'status-box error';
        statusMsg.innerText = `Submission error: ${err.message}`;
        statusMsg.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Self-Assessment';
    }
});

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getCityValue() {
    const selected = document.querySelector('input[name="citySelection"]:checked');
    if (!selected) return '';
    if (selected.value === 'Delhi NCR') {
        const subCity = document.getElementById('delhiSubCity').value;
        return subCity ? `Delhi NCR (${subCity})` : 'Delhi NCR';
    }
    if (selected.value === 'Other') {
        const customCity = document.getElementById('otherCityInput').value.trim();
        return customCity ? `Other (${customCity})` : 'Other';
    }
    return selected.value;
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value)
        .join(', ');
}

function getFormattedLanguages() {
    const languages = [
        { key: 'lang_english', name: 'English' },
        { key: 'lang_hindi', name: 'Hindi' },
        { key: 'lang_marathi', name: 'Marathi' }
    ];
    let results = [];
    languages.forEach(lang => {
        const checked = Array.from(document.querySelectorAll(`input[name="${lang.key}"]:checked`)).map(cb => cb.value);
        if (checked.length > 0) results.push(`${lang.name} (${checked.join(', ')})`);
    });
    const otherName = document.getElementById('otherLangName').value.trim();
    const otherChecked = Array.from(document.querySelectorAll('input[name="lang_other"]:checked')).map(cb => cb.value);
    if (otherChecked.length > 0 || otherName) {
        const nameLabel = otherName ? `Other - ${otherName}` : 'Other';
        results.push(`${nameLabel} (${otherChecked.join(', ')})`);
    }
    return results.join('; ');
}