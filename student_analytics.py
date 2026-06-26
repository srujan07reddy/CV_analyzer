#!/usr/bin/env python
"""
Industry 6.0 Student Analytics Caching Dashboard Module
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
        Calculates student averages, track match scoring, technology tags, and percentages.
        Performs all mathematical logic locally using pandas to minimize token usage.
        """
        # Find student row
        student_row = df[df['roll_number'].str.upper() == student_id.upper()]
        if student_row.empty:
            raise ValueError(f"Student ID {student_id} not found in database.")

        student_data = student_row.iloc[0]

        # Calculate overall class averages for context
        avg_talks = df['lead_talks_delivered'].mean()
        avg_rubiks = df['rubiks_cube_events'].mean()
        
        # Handle dynamic outreach key matching (since outreach visits column name can vary)
        outreach_col = [col for col in df.columns if 'outreach' in col.lower() or 'visit' in col.lower()]
        outreach_val = student_data[outreach_col[0]] if outreach_col else 0
        avg_outreach = df[outreach_col[0]].mean() if outreach_col else 0

        # Handle mask off column matching
        maskoff_col = [col for col in df.columns if 'mask' in col.lower() or 'off' in col.lower()]
        maskoff_val = student_data[maskoff_col[0]] if maskoff_col else 0
        avg_maskoff = df[maskoff_col[0]].mean() if maskoff_col else 0

        # Percentages relative to high benchmarks (e.g. target 10 sessions)
        percentage_metrics = {
            'lead_talks': min(100.0, float(student_data['lead_talks_delivered']) / 10.0 * 100),
            'rubiks': min(100.0, float(student_data['rubiks_cube_events']) / 10.0 * 100),
            'outreach': min(100.0, float(outreach_val) / 10.0 * 100),
            'maskoff': min(100.0, float(maskoff_val) / 10.0 * 100)
        }

        # Track Match Scoring (Weighted indices scaled to 100 max)
        skills_list = [s.strip() for s in str(student_data.get('top_skills', '')).split(',') if s.strip()]
        skills_count = len(skills_list)
        
        # Track A: Technical Facilitator Score (weighted)
        tech_score = (0.5 * student_data['lead_talks_delivered'] + 
                      0.3 * student_data['rubiks_cube_events'] + 
                      0.2 * min(10, skills_count)) * 10.0
        
        # Track B: Community Engagement Score (weighted)
        community_score = (0.6 * outreach_val + 0.4 * maskoff_val) * 10.0

        track_scores = {
            'Technical Facilitator Track': min(100.0, tech_score),
            'Community Engagement Track': min(100.0, community_score)
        }

        return {
            'student_id': student_id,
            'name': student_data['name'],
            'department': student_data['department'],
            'lead_talks_delivered': int(student_data['lead_talks_delivered']),
            'rubiks_cube_events': int(student_data['rubiks_cube_events']),
            'outreach_visits': int(outreach_val),
            'mask_off_attendance': int(maskoff_val),
            'skills': skills_list,
            'averages': {
                'lead_talks': round(avg_talks, 2),
                'rubiks': round(avg_rubiks, 2),
                'outreach': round(avg_outreach, 2),
                'maskoff': round(avg_maskoff, 2)
            },
            'percentages': percentage_metrics,
            'track_scores': track_scores
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
            'talks': metrics['lead_talks_delivered'],
            'rubiks': metrics['rubiks_cube_events'],
            'outreach': metrics['outreach_visits'],
            'maskoff': metrics['mask_off_attendance'],
            'skills': sorted(metrics['skills']),
            'tracks': metrics['track_scores']
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
                "Act as an Industry 6.0 engineering assessor. Summarize the provided student metrics "
                "into a 3-sentence technical portfolio evaluation. Do not include conversational filler or introductions."
            )
            
            prompt = f"""
Candidate: {metrics['name']} ({metrics['department']})
Metrics:
- Lead Talks Delivered: {metrics['lead_talks_delivered']} (Class Avg: {metrics['averages']['lead_talks']})
- Rubik's Cube Events: {metrics['rubiks_cube_events']} (Class Avg: {metrics['averages']['rubiks']})
- Community Outreach: {metrics['outreach_visits']} (Class Avg: {metrics['averages']['outreach']})
- MASK OFF Sessions: {metrics['mask_off_attendance']} (Class Avg: {metrics['averages']['maskoff']})
- Track Scores: {json.dumps(metrics['track_scores'])}
- Technology Skills: {', '.join(metrics['skills'])}
"""
            
            model = genai.GenerativeModel(
                model_name='gemini-2.5-flash',
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
        best_track = max(metrics['track_scores'], key=metrics['track_scores'].get)
        score = metrics['track_scores'][best_track]
        
        fallback_text = (
            f"[Local Assessment Fallback - Rate Limited/Offline: {error_msg}]\n"
            f"Candidate {metrics['name']} demonstrates primary readiness for the {best_track} "
            f"with a score of {score:.1f}/100. Local analysis shows solid contributions "
            f"including {metrics['lead_talks_delivered']} Lead Talks and {metrics['rubiks_cube_events']} Rubik's Cube events, "
            f"complemented by technology skills: {', '.join(metrics['skills'] or ['General Facilitation'])}."
        )
        return fallback_text

# Mock Seed Data for instantaneous local calculations
MOCK_DATA = [
    {
        "roll_number": "20JUCSE001",
        "name": "Arjun Sharma",
        "department": "Computer Science",
        "lead_talks_delivered": 4,
        "rubiks_cube_events": 6,
        "Outreach Visits": 5,
        "MASK OFF Attendance": 8,
        "top_skills": "Python, SQL, React, Cloud"
    },
    {
        "roll_number": "20JUCSE002",
        "name": "Bhavana Reddy",
        "department": "Computer Science",
        "lead_talks_delivered": 2,
        "rubiks_cube_events": 8,
        "Outreach Visits": 7,
        "MASK OFF Attendance": 4,
        "top_skills": "Java, HTML, CSS, Figma"
    },
    {
        "roll_number": "20JUITS015",
        "name": "Charan Kumar",
        "department": "Information Technology",
        "lead_talks_delivered": 7,
        "rubiks_cube_events": 3,
        "Outreach Visits": 2,
        "MASK OFF Attendance": 6,
        "top_skills": "React, Node, Javascript, Git"
    },
    {
        "roll_number": "20JUECE088",
        "name": "Divya N",
        "department": "Electronics & Communication",
        "lead_talks_delivered": 5,
        "rubiks_cube_events": 5,
        "Outreach Visits": 9,
        "MASK OFF Attendance": 10,
        "top_skills": "Python, C++, Docker, Cloud"
    }
]

# Check streamlit availability
try:
    import streamlit as st
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False

if HAS_STREAMLIT:
    # streamlit layout
    st.set_page_config(page_title="Industry 6.0 Student Analytics Dashboard", layout="wide")

    st.markdown("""
        <div style="background: rgba(6, 182, 212, 0.08); padding: 16px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2); margin-bottom: 24px;">
            <h1 style="color: #06b6d4; margin: 0; font-size: 28px;">🚀 Industry 6.0 Student Analytics</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Local pre-aggregation caching dashboard with Gemini-Flash narrative automation.</p>
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

        col1, col2 = st.columns([1, 1])

        with col1:
            st.subheader(f"Profile: {metrics['name']} ({metrics['student_id']})")
            st.markdown(f"**Department:** {metrics['department']}")
            st.markdown(f"**Technology Tags:** {', '.join(metrics['skills'])}")
            
            # Metric scores
            st.write("#### Performance Summary")
            perf_df = pd.DataFrame({
                'Metric': ['Lead Talks', 'Rubik\'s Cube', 'Outreach Visits', 'MASK OFF Attendance'],
                'Score': [metrics['lead_talks_delivered'], metrics['rubiks_cube_events'], metrics['outreach_visits'], metrics['mask_off_attendance']],
                'Class Avg': [metrics['averages']['lead_talks'], metrics['averages']['rubiks'], metrics['averages']['outreach'], metrics['averages']['maskoff']]
            })
            st.table(perf_df)

        with col2:
            st.subheader("Competency Tracks Match")
            for track, score in metrics['track_scores'].items():
                st.markdown(f"**{track}**")
                st.progress(score / 100.0)
                st.write(f"Competency score: `{score:.1f}/100`")

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
                'talks': metrics['lead_talks_delivered'],
                'rubiks': metrics['rubiks_cube_events'],
                'outreach': metrics['outreach_visits'],
                'maskoff': metrics['mask_off_attendance'],
                'skills': sorted(metrics['skills']),
                'tracks': metrics['track_scores']
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
        parser = argparse.ArgumentParser(description="Industry 6.0 Student Analytics Engine")
        parser.add_argument('--student', type=str, help='Select student Roll Number (e.g. 20JUCSE001)')
        parser.add_argument('--key', type=str, help='Gemini API key')
        args = parser.parse_args()

        engine = StudentAnalyticsEngine()
        df = pd.DataFrame(MOCK_DATA)

        print("\n=== Industry 6.0 Student Analytics CLI ===")
        
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
            print("-" * 40)
            print(f"Lead Talks Delivered: {metrics['lead_talks_delivered']} (Avg: {metrics['averages']['lead_talks']})")
            print(f"Rubik's Cube Events: {metrics['rubiks_cube_events']} (Avg: {metrics['averages']['rubiks']})")
            print(f"Outreach Visits: {metrics['outreach_visits']} (Avg: {metrics['averages']['outreach']})")
            print(f"MASK OFF Attendance: {metrics['mask_off_attendance']} (Avg: {metrics['averages']['maskoff']})")
            print("-" * 40)
            print("Track Suitability Scores:")
            for track, score in metrics['track_scores'].items():
                print(f"  {track}: {score:.1f}/100")
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
