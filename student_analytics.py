#!/usr/bin/env python
"""
Jeppiaar Shikshak — Student Analytics Caching Module
Provides local pandas-driven pre-aggregation, SQLite reports caching,
and token-efficient, on-demand AI portfolio evaluations.
"""

import os
import json
import hashlib
import sqlite3
from datetime import datetime
import pandas as pd

class StudentAnalyticsEngine:
    def __init__(self, db_path='platform_cache.db'):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS reports (
                    student_id TEXT PRIMARY KEY,
                    metrics_hash TEXT,
                    narrative TEXT,
                    timestamp TEXT
                )
            ''')
            conn.commit()

    def compute_student_metrics(self, df: pd.DataFrame, student_id: str):
        """
        Calculates student analytics, including parsed technology tags and projects list.
        """
        # Find student row
        student_row = df[df['roll_number'].str.upper() == student_id.upper()]
        if student_row.empty:
            raise ValueError(f"Student ID {student_id} not found in database.")

        student_data = student_row.iloc[0]

        # Parse skills (supports list array or comma-separated string)
        skills_val = student_data.get('skills', '')
        if isinstance(skills_val, list):
            skills_list = [str(s).strip() for s in skills_val if str(s).strip()]
        elif isinstance(skills_val, str) and skills_val.startswith('[') and skills_val.endswith(']'):
            # In case it was serialized as a string representation of a list
            try:
                parsed_list = json.loads(skills_val)
                skills_list = [str(s).strip() for s in parsed_list if str(s).strip()]
            except:
                skills_list = [s.strip() for s in skills_val.split(',') if s.strip()]
        else:
            skills_str = str(student_data.get('top_skills', '') or skills_val or '')
            skills_list = [s.strip() for s in skills_str.split(',') if s.strip()]

        # Parse projects (supports JSONB array of objects, list, or string)
        projects_val = student_data.get('projects', '')
        if isinstance(projects_val, list):
            proj_titles = []
            for p in projects_val:
                if isinstance(p, dict):
                    proj_titles.append(p.get('title') or p.get('name') or str(p))
                else:
                    proj_titles.append(str(p))
            projects_str = ', '.join(proj_titles)
        elif isinstance(projects_val, str) and projects_val.startswith('['):
            try:
                parsed_proj = json.loads(projects_val)
                if isinstance(parsed_proj, list):
                    proj_titles = []
                    for p in parsed_proj:
                        if isinstance(p, dict):
                          proj_titles.append(p.get('title') or p.get('name') or str(p))
                        else:
                          proj_titles.append(str(p))
                    projects_str = ', '.join(proj_titles)
                else:
                    projects_str = str(parsed_proj)
            except:
                projects_str = projects_val
        else:
            projects_str = str(projects_val)

        return {
            'student_id': student_id,
            'name': student_data['name'],
            'department': student_data['department'],
            'skills': skills_list,
            'projects': projects_str
        }

    def generate_ai_insight(self, student_id: str, metrics: dict, api_key: str = None) -> tuple:
        """
        Generates MD5 hash of condensed student metrics. Checks SQLite cache.
        If missed, queries Gemini Flash with strict token-efficient budgets.
        Returns (narrative_text, was_cached)
        """
        # Generate condensed metrics representation for hashing
        condensed = {
            'id': student_id,
            'name': metrics['name'],
            'department': metrics['department'],
            'skills': sorted(metrics['skills']),
            'projects': metrics['projects']
        }
        metrics_str = json.dumps(condensed, sort_keys=True)
        metrics_hash = hashlib.md5(metrics_str.encode('utf-8')).hexdigest()

        # Check Cache
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT metrics_hash, narrative FROM reports WHERE student_id = ?', (student_id,))
            row = cursor.fetchone()
            if row and row[0] == metrics_hash:
                return row[1], True

        # Cache Miss -> API Call
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY", "")

        if not api_key:
            return self._graceful_fallback(metrics, "GEMINI_API_KEY environment variable missing."), False

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            system_prompt = (
                "Act as a Jeppiaar Shikshak faculty assessor. Summarize the provided student's skills "
                "and projects into a 3-sentence technical portfolio evaluation. Do not include conversational filler or introductions."
            )
            
            prompt = f"""
Candidate: {metrics['name']} ({metrics['department']})
Technology Skills: {', '.join(metrics['skills'])}
Key Projects: {metrics['projects']}
"""
            
            model = genai.GenerativeModel(
                model_name='gemini-1.5-flash',
                generation_config={
                    "max_output_tokens": 150,
                    "temperature": 0.2,
                },
                system_instruction=system_prompt
            )
            
            response = model.generate_content(prompt)
            narrative = response.text.strip()

            # Save to Cache
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    'INSERT OR REPLACE INTO reports (student_id, metrics_hash, narrative, timestamp) VALUES (?, ?, ?, ?)',
                    (student_id, metrics_hash, narrative, datetime.now().isoformat())
                )
                conn.commit()

            return narrative, False

        except Exception as e:
            return self._graceful_fallback(metrics, str(e)), False

    def _graceful_fallback(self, metrics: dict, error_msg: str) -> str:
        """
        Graceful fallback to standard Python metrics and rule-based evaluation
        if the API encounters a rate limit or network issue.
        """
        fallback_text = (
            f"[Local Assessment Fallback - Rate Limited/Offline: {error_msg}]\n"
            f"Candidate {metrics['name']} is evaluated based on local portfolio data. "
            f"Key projects include: {metrics['projects'] or 'None listed'}. "
            f"Technology skills: {', '.join(metrics['skills'] or ['General Engineering'])}."
        )
        return fallback_text

# No pre-loaded mock data — students are imported via CSV/JSON in the front-end.
# This list can be populated with real student records when running the CLI.
MOCK_DATA = []

# Check streamlit availability
try:
    import streamlit as st
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False

if HAS_STREAMLIT:
    # streamlit layout
    st.set_page_config(page_title="Jeppiaar Shikshak - Student Analytics Dashboard", layout="wide")

    st.markdown("""
        <div style="background: rgba(6, 182, 212, 0.08); padding: 16px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2); margin-bottom: 24px;">
            <h1 style="color: #06b6d4; margin: 0; font-size: 28px;">📘 Jeppiaar Shikshak — Student Analytics</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Local caching dashboard with Gemini-Flash narrative automation for portfolio assessment.</p>
        </div>
    """, unsafe_allow_html=True)

    # Initialize Engine
    engine = StudentAnalyticsEngine()
    df_students = pd.DataFrame(MOCK_DATA)

    # Sidebar / Selection
    st.sidebar.subheader("Configuration")
    api_key_input = st.sidebar.text_input("Gemini API Key", value=os.environ.get("GEMINI_API_KEY", ""), type="password")
    
    st.sidebar.subheader("Select Student ID")
    selected_id = st.sidebar.selectbox("Roster Profiles", df_students['roll_number'].tolist())

    if selected_id:
        # 1. Pure Python calculations rendered instantly
        metrics = engine.compute_student_metrics(df_students, selected_id)

        st.subheader(f"Profile: {metrics['name']} ({metrics['student_id']})")
        st.markdown(f"**Department:** {metrics['department']}")
        st.markdown(f"**Technology Tags:** {', '.join(metrics['skills'])}")
        st.markdown(f"**Key Projects:** {metrics['projects']}")

        st.divider()

        # 2. On-Demand Activation
        st.subheader("AI Narrative Assessment")
        
        # Display cache check status
        with sqlite3.connect(engine.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT metrics_hash FROM reports WHERE student_id = ?', (selected_id,))
            cached_row = cursor.fetchone()
            
            # Compute current hash
            condensed = {
                'id': selected_id,
                'name': metrics['name'],
                'department': metrics['department'],
                'skills': sorted(metrics['skills']),
                'projects': metrics['projects']
            }
            curr_hash = hashlib.md5(json.dumps(condensed, sort_keys=True).encode('utf-8')).hexdigest()
            
            if cached_row and cached_row[0] == curr_hash:
                st.info("⚡ System Cache Status: Ready (Up-to-Date Narrative cached locally in SQLite)")
            else:
                st.warning("🔄 System Cache Status: Miss (Needs new evaluation - API call required)")

        if st.button("Generate AI Portfolio Insight", type="primary"):
            with st.spinner("Processing local SQLite cache and executing assessor evaluation..."):
                narrative, cached = engine.generate_ai_insight(selected_id, metrics, api_key_input)
                
                if cached:
                    st.success("⚡ Narrative loaded directly from platform SQLite Cache (Zero Token Burn!)")
                else:
                    st.success("🤖 Narrative compiled via Gemini API Assessor")
                
                st.markdown(f"""
                    <div style="background: rgba(255,255,255,0.02); border-left: 4px solid #06b6d4; padding: 16px; border-radius: 4px; font-style: italic;">
                        "{narrative}"
                    </div>
                """, unsafe_allow_html=True)

else:
    # CLI fallback launcher
    import argparse
    
    def main():
        parser = argparse.ArgumentParser(description="Jeppiaar Shikshak Student Analytics Engine")
        parser.add_argument('--student', type=str, help='Select student Roll Number (e.g. 20JUCSE001)')
        parser.add_argument('--key', type=str, help='Gemini API key')
        args = parser.parse_args()

        engine = StudentAnalyticsEngine()
        df = pd.DataFrame(MOCK_DATA)

        print("\n=== Jeppiaar Shikshak Student Analytics CLI ===")
        
        if not args.student:
            print("Roster profiles:")
            for s in MOCK_DATA:
                print(f"- {s['roll_number']}: {s['name']} ({s['department']})")
            print("\nPlease rerun with --student <roll_number>")
            return

        try:
            metrics = engine.compute_student_metrics(df, args.student)
            print(f"\nProfile Results for {metrics['name']} ({metrics['student_id']})")
            print(f"Department: {metrics['department']}")
            print(f"Skills: {', '.join(metrics['skills'])}")
            print(f"Projects: {metrics['projects']}")
            print("-" * 40)

            print("Cache Check & AI Assessment...")
            narrative, cached = engine.generate_ai_insight(args.student, metrics, args.key)
            if cached:
                print("⚡ Loaded directly from SQLite Cache (Zero Token Burn!):")
            else:
                print("🤖 Generated via Gemini Assessor:")
            print(f"\n\"{narrative}\"\n")
        except Exception as e:
            print(f"Error: {e}")

    if __name__ == '__main__':
        main()
