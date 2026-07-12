import sys
import unittest
from io import BytesIO
from backend import clean_text, compute_cosine_similarity, extract_skills, extract_cgpa, extract_experience, extract_email, app

class TestResumeScreeningNLP(unittest.TestCase):

    def test_clean_text(self):
        text = "Hello World! This is a simple Test, with numbers 123 and C++ and C#."
        tokens = clean_text(text)
        # Verify stopwords like 'is', 'a', 'with' are removed
        self.assertNotIn("is", tokens)
        self.assertNotIn("a", tokens)
        self.assertNotIn("with", tokens)
        # Verify custom programming terms and cleaned tokens remain
        self.assertIn("hello", tokens)
        self.assertIn("world", tokens)
        self.assertIn("c++", tokens)
        self.assertIn("c#", tokens)

    def test_compute_cosine_similarity(self):
        # High similarity
        text1 = "Python developer with machine learning experience building Flask web apps"
        text2 = "Looking for a Python developer experienced in Flask and web apps"
        sim_high = compute_cosine_similarity(text1, text2)
        
        # Low similarity
        text3 = "Graphic designer specializing in photoshop and Figma layouts"
        sim_low = compute_cosine_similarity(text1, text3)
        
        self.assertGreater(sim_high, sim_low)
        self.assertGreater(sim_high, 0.2)
        self.assertLess(sim_low, 0.1)

    def test_extract_skills(self):
        resume = "Skills: Python, HTML, CSS, JavaScript, React, SQL, Git, and Docker."
        target_skills = ["Python", "React", "Rust", "Docker", "Java"]
        matched, missing, score = extract_skills(resume, target_skills)
        
        self.assertIn("Python", matched)
        self.assertIn("React", matched)
        self.assertIn("Docker", matched)
        self.assertIn("Rust", missing)
        self.assertIn("Java", missing)
        self.assertEqual(score, 60.0) # 3 out of 5

    def test_extract_cgpa(self):
        test_cases = [
            ("Graduated with a CGPA of 9.2 in Computer Science", 9.2),
            ("Secured a 8.5 pointer overall.", 8.5),
            ("Academic Performance: CGPA: 7.8/10", 7.8),
            ("Scored 85.0% marks in under-graduation", 8.5), # 85% converted to 8.5
            ("Completed B.Tech. GPA: 9.0 out of 10.", 9.0),
            ("No CGPA mentioned in this text.", None)
        ]
        
        for text, expected in test_cases:
            result = extract_cgpa(text)
            self.assertEqual(result, expected, f"Failed on: {text}")

    def test_extract_experience(self):
        test_cases = [
            ("Over 5 years of experience in Software Development", 5),
            ("Having 3+ years exp as a frontend engineer.", 3),
            ("Work Experience: 2 years in Python development", 2),
            ("No experience mentioned.", 0)
        ]
        
        for text, expected in test_cases:
            result = extract_experience(text)
            self.assertEqual(result, expected, f"Failed on: {text}")

    def test_extract_email(self):
        test_cases = [
            ("Contact me at john.doe@example.com for details.", "john.doe@example.com"),
            ("Email: candidates_info+12@test-domain.org", "candidates_info+12@test-domain.org"),
            ("No email address here.", ""),
        ]
        
        for text, expected in test_cases:
            result = extract_email(text)
            self.assertEqual(result, expected, f"Failed on: {text}")

    def test_database_crud_flow(self):
        import os
        original_smtp = os.environ.get("SMTP_SERVER")
        if "SMTP_SERVER" in os.environ:
            del os.environ["SMTP_SERVER"]

        try:
            client = app.test_client()
            
            # 1. CREATE / INSERT (analyze_bulk)
            data = {
                'jobTitle': 'Database Specialist',
                'skills': 'Python, SQL, SQLite',
                'minCgpa': '8.0',
                'minExperience': '2',
                'jobDesc': 'Looking for an SQL database developer using SQLite and Python.'
            }
            data['resumes'] = [
                (BytesIO(b"Harsha B S\nEmail: harsha@example.com\nSkills: Python, SQL, SQLite\nCGPA: 9.1\n3 years experience."), "harsha.txt"),
                (BytesIO(b"John Doe\nSkills: Java, HTML\nCGPA: 7.5\n0 years experience."), "john.txt")
            ]
            
            response = client.post('/analyze_bulk', data=data, content_type='multipart/form-data')
            self.assertEqual(response.status_code, 200)
            res_json = response.get_json()
            self.assertEqual(res_json['status'], 'success')
            self.assertIn('jobId', res_json)
            job_id = res_json['jobId']
            
            # 2. RETRIEVAL (get jobs list and job session)
            list_response = client.get('/api/jobs')
            self.assertEqual(list_response.status_code, 200)
            jobs_list = list_response.get_json()
            self.assertTrue(len(jobs_list) > 0)
            
            session_response = client.get(f'/api/jobs/{job_id}')
            self.assertEqual(session_response.status_code, 200)
            session_json = session_response.get_json()
            
            self.assertEqual(session_json['jobTitle'], 'Database Specialist')
            self.assertEqual(len(session_json['candidates']), 2)
            
            # Verify rank order (Harsha is Rank 1, John is Rank 2)
            harsha = session_json['candidates'][0]
            john = session_json['candidates'][1]
            self.assertEqual(harsha['name'], 'Harsha B S')
            self.assertEqual(harsha['rank'], 1)
            self.assertEqual(harsha['details']['email'], 'harsha@example.com')
            self.assertEqual(john['name'], 'John Doe')
            self.assertEqual(john['rank'], 2)
            self.assertEqual(john['details']['email'], '')
            
            candidate_id = harsha['id']
            
            # 3. UPDATE (update candidate notes and email)
            update_response = client.put(f'/api/candidates/{candidate_id}', json={
                'notes': 'Strong database candidate.',
                'email': 'harsha.b@example.com'
            })
            self.assertEqual(update_response.status_code, 200)
            
            # Retrieve candidate details to verify notes, summary, and email are updated
            session_response = client.get(f'/api/jobs/{job_id}')
            candidate_details = session_response.get_json()['candidates'][0]['details']
            self.assertEqual(candidate_details['notes'], 'Strong database candidate.')
            self.assertEqual(candidate_details['email'], 'harsha.b@example.com')
            self.assertIn('summary', candidate_details)
            self.assertTrue(len(candidate_details['summary']) > 0)
            
            # Test SMTP Status Endpoint
            smtp_status_response = client.get('/api/smtp-status')
            self.assertEqual(smtp_status_response.status_code, 200)
            smtp_json = smtp_status_response.get_json()
            self.assertIn('configured', smtp_json)
            self.assertIn('server', smtp_json)
            
            # Mark candidate as Shortlisted
            shortlist_update = client.put(f'/api/candidates/{candidate_id}', json={
                'shortlist_status': 'Shortlisted'
            })
            self.assertEqual(shortlist_update.status_code, 200)
    
            # Test Bulk Shortlist Notifications Endpoint
            bulk_notify_response = client.post(f'/api/jobs/{job_id}/notify-shortlisted', json={
                'company': 'Google'
            })
            self.assertEqual(bulk_notify_response.status_code, 200)
            bulk_json = bulk_notify_response.get_json()
            self.assertEqual(bulk_json['status'], 'success')
            self.assertEqual(bulk_json['sent_count'], 1)
            self.assertTrue(bulk_json['details'][0]['mocked'])
    
            # Send Email notification test
            send_email_response = client.post(f'/api/candidates/{candidate_id}/send-email', json={
                'email': 'harsha.b@example.com',
                'company': 'Google'
            })
            self.assertEqual(send_email_response.status_code, 200)
            send_res_json = send_email_response.get_json()
            self.assertEqual(send_res_json['status'], 'success')
            self.assertTrue('Mock email' in send_res_json['message'])
            self.assertTrue(send_res_json['mock'])
            
            # 4. DELETE (delete candidate)
            del_cand_response = client.delete(f'/api/candidates/{candidate_id}')
            self.assertEqual(del_cand_response.status_code, 200)
            
            # Retrieve session and verify only 1 candidate remains
            session_response = client.get(f'/api/jobs/{job_id}')
            self.assertEqual(len(session_response.get_json()['candidates']), 1)
            
            # 5. DELETE (delete job session)
            del_job_response = client.delete(f'/api/jobs/{job_id}')
            self.assertEqual(del_job_response.status_code, 200)
            
            # Verify session is deleted (returns 404)
            get_deleted_response = client.get(f'/api/jobs/{job_id}')
            self.assertEqual(get_deleted_response.status_code, 404)
        finally:
            if original_smtp:
                os.environ["SMTP_SERVER"] = original_smtp

    def test_image_screening_flow_missing_key(self):
        client = app.test_client()
        
        # Mock OPENROUTER_API_KEY to be empty
        import backend
        original_key = backend.OPENROUTER_API_KEY
        backend.OPENROUTER_API_KEY = None
        
        try:
            data = {
                'jobTitle': 'Image Architect',
                'skills': 'Figma, Design',
                'minCgpa': '0.0',
                'minExperience': '0',
                'jobDesc': 'Looking for a designer.'
            }
            # Upload a mock image file
            data['resumes'] = [
                (BytesIO(b"mock image bytes here"), "resume.png")
            ]
            
            response = client.post('/analyze_bulk', data=data, content_type='multipart/form-data')
            self.assertEqual(response.status_code, 200)
            
            res_json = response.get_json()
            job_id = res_json['jobId']
            
            # Fetch the candidate details to check the fallback
            session_response = client.get(f'/api/jobs/{job_id}')
            self.assertEqual(session_response.status_code, 200)
            candidates = session_response.get_json()['candidates']
            self.assertEqual(len(candidates), 1)
            
            cand = candidates[0]
            self.assertEqual(cand['status'], 'Missing API Key')
            self.assertEqual(cand['overallScore'], 0.0)
            self.assertIn("requires a valid OPENROUTER_API_KEY", cand['details']['summary'])
            
            # Delete the job session
            client.delete(f'/api/jobs/{job_id}')
        finally:
            backend.OPENROUTER_API_KEY = original_key

if __name__ == "__main__":
    unittest.main()
