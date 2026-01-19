# SDAC AI Validation Assistant - Functional Requirements (Prototype)
**Demo Target**: Missouri State Board Association  
**Timeline**: 2 weeks  
**Focus**: Act 2 - The AI Solution (5 minutes)

---

## 1. OVERVIEW

### Purpose
Define functional requirements for a prototype demonstrating AI-assisted SDAC cost data validation. The prototype uses pre-scripted interactions to showcase how the AI assistant improves the validation workflow.

### Scope
- **Prototype Only**: No live backend, no real API integration, no database
- **Pre-scripted Data**: 2-3 mock cost data reports with predetermined issues
- **Demonstration**: Show 4 core capabilities in 5-minute demo sequence

### Success Criteria
- Smooth demo flow without technical glitches
- Clear demonstration of AI value in 5 minutes
- Compelling enough to secure stakeholder buy-in

---

## 2. MOCK DATA REQUIREMENTS

### 2.1 Cost Data Reports (2-3 Pre-loaded)

#### Report Option A: "Maplewood-Richmond Heights Q3-2025"
**District Profile**: Generally compliant, moderate issues

**Basic Information**:
- District Name: Maplewood-Richmond Heights
- Quarter: Q3-2025
- Submission Date: June 24, 2025
- Number of Positions: 18
- Total Salary (CP2): $243,980
- Total Fringe (CP2): $63,548
- Previous Quarter (Q3-2024): $217,500 salary, $58,450 fringe
- Salary Differential: +12.3%
- Fringe Differential: +8.7%
- Submitted Justification: "General salary increases and fringe rate adjustments"

**Pre-determined Issues** (3 total):
1. **High Priority**: Position #7 (Goldberg, School Nurse) has source code "4" but claiming costs of $7,196
2. **Medium Priority**: Position #12 has $0 salary with no explanatory comment
3. **Medium Priority**: Justification incomplete - doesn't mention 2 new positions (Williams and Lee) added this quarter

**Historical Context**:
- Q2-2025: Validated (no issues)
- Q1-2025: Sent back once (source code errors, missing comments - corrected quickly)
- Q4-2024: Validated (no issues)
- No cost pool placement issues historically

#### Report Option B: "Archie R-V Q3-2025" (Optional)
**District Profile**: Recurring issues, needs more careful review

**Basic Information**:
- District Name: Archie R-V
- Quarter: Q3-2025
- Number of Positions: 12
- Issues: Cost pool misplacement, federal funding not backed out, inadequate justifications

**Historical Context**:
- Recurring issues with federal funding and cost pool placements
- Requires direct contact typically

### 2.2 Personnel Data Structure

For each position in the mock report, include:
- Position ID (sequential number)
- Source Code (1, 2, 3, or 4)
- Function Code (e.g., 2122, 2134, 2113)
- Cost Pool (1 or 2)
- Job Title (e.g., "School Counselor", "School Nurse")
- First Name
- Last Name
- Gross Salary
- Gross Fringe
- % Federal Funds
- % State/Local Funds
- Claimable Salary (calculated)
- Claimable Fringe (calculated)
- Direct Support Personnel (Y/N)
- Comments (text field)

### 2.3 Reference Data

**Sendback Message Templates**:
Store 5-10 pre-written sendback message variations matching common error types:
- Source code 4 with claimed costs
- Missing comments on $0 positions
- Incomplete justifications
- Cost pool misplacements
- Federal funding not backed out

**Function Code Reference** (subset):
- 2122: School Counselor
- 2134: School Nurse
- 2113: Social Worker
- 2411: Assistant Principal
- 1193: Alternative Education Staff
- 2321: Included in indirect rate (NOT eligible)
- 2546: Included in indirect rate (NOT eligible)

**Source Code Rules**:
- 1 = Local funding (eligible)
- 2 = County funding (eligible)
- 3 = State funding (eligible)
- 4 = Federal funding (NOT eligible - must be backed out)

**Cost Pool Classification Rules**:
- CP1: Direct IEP-based services to students (RBTs, aides providing IEP services)
- CP2: Administrative, counseling, nursing, social work (unless providing direct IEP services)

---

## 3. FUNCTIONAL REQUIREMENTS - ACT 2 (THE AI SOLUTION)

### Scene 1: Proactive Issue Detection (1 minute)

#### FR-1.1: Widget Initial Appearance
**Function**: Display AI widget in collapsed state when cost data page loads

**Requirements**:
- Widget appears as circular button in bottom-right corner
- Displays "SDAC Assistant" label
- Shows numerical badge indicating number of detected issues (e.g., "3")
- Badge has subtle pulsing animation to draw attention
- Widget positioned 24px from bottom and right edges
- Widget dimensions: 60px × 60px
- Widget remains fixed on scroll

**Trigger**: Page load complete

**Visual State**: Collapsed with badge

#### FR-1.2: Widget Activation
**Function**: Expand widget and begin analysis when user clicks

**Requirements**:
- On click, widget expands to 400px × 600px panel
- Panel slides in from bottom-right with smooth animation (300ms)
- During expansion, show "Analyzing cost data report..." message with animated spinner
- Analysis state displays for 2 seconds (simulated processing time)
- After analysis, automatically transition to results display

**Trigger**: User clicks collapsed widget

**Visual State**: Expanded with loading indicator → Issue summary

#### FR-1.3: Issue Summary Display
**Function**: Show categorized list of detected issues

**Requirements**:
- Display greeting message: "I've reviewed [District Name] [Quarter] and found [N] potential issues:"
- Group issues by priority level:
  - ⚠️ High Priority (count): Critical validation blockers
  - ⚡ Medium Priority (count): Important but not critical
  - ✓ Low Priority (count): Minor improvements (if any)
- Each issue shows:
  - Specific position reference (e.g., "Position #7 (Goldberg)")
  - Brief description of issue
  - Affected amount (if applicable)
- Display action buttons:
  - [View Details] - expands each issue
  - [Draft Sendback] - triggers sendback generation
- Use emoji indicators for visual hierarchy
- Color-code priority levels (red, amber, blue)

**Pre-scripted Output** (Maplewood-Richmond Heights):
```
🤖 I've reviewed Maplewood-Richmond Heights Q3-2025 
and found 3 potential issues:

⚠️ High Priority (1)
• Position #7 (Goldberg): Source code 4 with claimed 
  costs ($7,196)

⚡ Medium Priority (2)
• Missing comment on position #12 ($0 salary)
• Justification incomplete - doesn't explain new positions

[View Details] [Draft Sendback]
```

**Trigger**: Completion of 2-second analysis animation

**Visual State**: Expanded panel with issue summary

---

### Scene 2: Intelligent Q&A (1.5 minutes)

#### FR-2.1: Natural Language Input
**Function**: Accept user questions in conversational text

**Requirements**:
- Text input field at bottom of chat panel
- Placeholder text: "Ask me anything... 💬"
- Input field min-height: 40px, auto-expands to 120px for longer queries
- Enter key submits question
- User message appears in chat as gray bubble, right-aligned
- After user submits, show typing indicator (3 dots animation) for 1 second before response

**Trigger**: User types question and presses Enter

**Visual State**: User message bubble added to chat

#### FR-2.2: Question Recognition & Response Matching
**Function**: Match user question to pre-scripted response

**Requirements**:
- Support 10+ pre-scripted question/answer pairs
- Match questions using:
  - Exact phrase matching (e.g., "draft a sendback")
  - Keyword matching (e.g., "fringe", "differential" → fringe explanation)
  - Partial phrase matching (e.g., "last quarter" → historical context)
- If no match found, display fallback response with suggested questions
- Response appears as light blue bubble, left-aligned
- Prefix response with 🤖 emoji

**Required Q&A Pairs** (minimum 10):

1. **"Why is their fringe differential so high?"**
   ```
   The 8.7% fringe increase is driven by:
   
   1) Two new positions added (Williams, Lee) 
      contributing $7,108 in fringe
   2) General fringe rate increases across existing staff
   
   The salary differential is 12.3%, so the fringe increase 
   is proportional. However, their justification doesn't 
   mention the new positions—this should be addressed.
   ```

2. **"What did we tell this district last quarter?"**
   ```
   In Q2-2025, Maplewood-Richmond Heights was validated 
   with no issues.
   
   In Q1-2025, they were sent back for:
   1) Source code errors on 2 positions
   2) Missing comments for vacant positions
   
   They corrected these issues promptly and have not 
   repeated them.
   ```

3. **"Should this RBT be in cost pool 1 or 2?"**
   ```
   RBTs (Registered Behavior Technicians) should be in 
   Cost Pool 1 if they are providing IEP-based services 
   directly to students.
   
   Based on this district's roster, I see no RBTs listed. 
   Are you referring to a specific position? I can help 
   verify their cost pool placement.
   ```

4. **"Is this justification acceptable?"**
   ```
   The current justification states "general salary increases" 
   but this doesn't fully explain the 12.3% salary differential.
   
   The increase is actually caused by:
   1) Two new positions totaling $19,480
   2) General salary increases of ~4-5% for existing staff
   
   I recommend asking them to update the justification to 
   include the new positions.
   ```

5. **"What are the source code rules?"**
   ```
   Source codes indicate funding source:
   1 = Local
   2 = County
   3 = State
   4 = Federal
   
   Important rules:
   • A position can have multiple source codes (e.g., '1,3')
   • Source code 4 (federal) cannot be claimed for SDAC
   • If a position has '4', the % state/local funds must be 
     0% or federal portion backed out
   • Source codes must be verified each quarter
   ```

6. **"Show me the history of cost pool issues for this district"**
   ```
   Maplewood-Richmond Heights has no recorded cost pool 
   placement issues in the tracking database.
   
   All positions have been consistently classified in Cost 
   Pool 2 (counselors, nurses, admin).
   
   This is a well-performing district in this area.
   ```

7. **"Compare this to last quarter"**
   [Triggers FR-2.3 Comparison Feature]

8. **"Draft a sendback"** or **"Draft a sendback for the issues you found"**
   [Triggers FR-3.1 Sendback Generation]

9. **"What function codes are problematic?"**
   ```
   Function codes 2321 and 2546 are included in the 
   indirect cost rate and are NOT eligible for SDAC 
   reimbursement.
   
   If these appear, costs must be removed.
   
   I don't see any of these problematic codes in the 
   current submission.
   ```

10. **"Can I validate this?"**
    ```
    Not yet—there are 3 issues that need to be resolved first.
    
    You can either:
    1) Send back with feedback for the district to fix
    2) Contact the district directly to resolve
    
    Would you like me to draft the sendback message?
    ```

**Fallback Response** (when no match):
```
I'm not sure about that. Try asking about:
• Source codes and function codes
• Cost pool placements
• Justifications and differentials
• Comparisons to previous quarters
• District history and past issues
• Sendback generation

Or use the buttons below for common actions.
```

**Trigger**: User submits question

**Visual State**: AI response bubble added to chat

#### FR-2.3: Quarter-over-Quarter Comparison Feature
**Function**: Display detailed comparison between current and previous quarter

**Requirements**:
- Triggered by user asking "Compare this to last quarter" or similar
- Display formatted comparison with:
  - Personnel count changes
  - Salary differential with dollar amounts and percentages
  - Fringe differential with dollar amounts and percentages
  - List of new positions added (if any)
  - Justification status assessment
- Use visual indicators:
  - ↑ for increases, ↓ for decreases
  - ⚠️ for items requiring justification (>5% change)
  - ✓ for acceptable changes (<5%)
- Color-code differentials:
  - Green: <5% (no justification needed)
  - Yellow: 5-15% (justification required)
  - Red: >15% (requires detailed explanation)
- Include action button: [Draft Sendback] if issues found

**Pre-scripted Output** (Maplewood-Richmond Heights):
```
🤖 Comparing Q3-2025 to Q3-2024:

📊 PERSONNEL CHANGES
   • Q3-2024: 16 positions
   • Q3-2025: 18 positions
   • Change: +2 positions (↑ 12.5%)

💰 SALARY DIFFERENTIAL
   • Q3-2024: $217,500
   • Q3-2025: $243,980
   • Change: +$26,480 (+12.3%) ⚠️ Requires justification

🏥 FRINGE DIFFERENTIAL
   • Q3-2024: $58,450
   • Q3-2025: $63,548
   • Change: +$5,098 (+8.7%) ⚠️ Requires justification

📝 NEW POSITIONS THIS QUARTER
   • Williams (Alt Ed Intervention) - $10,268
   • Lee (Alt Services Interventionist) - $9,212

⚠️ JUSTIFICATION STATUS
   Current justification mentions "general salary increases"
   but doesn't explain the 2 new positions. Recommend updating.

[View Detailed Breakdown] [Draft Sendback]
```

**Trigger**: User asks about comparison

**Visual State**: Formatted comparison message in chat

---

### Scene 3: Automated Sendback Generation (1.5 minutes)

#### FR-3.1: Sendback Message Generation
**Function**: Create properly formatted sendback message based on detected issues

**Requirements**:
- Triggered by:
  - User clicking [Draft Sendback] button
  - User asking "draft a sendback" or similar
- Show "Generating sendback message..." with spinner for 1 second (simulated processing)
- Display formatted sendback message in special message bubble:
  - White background with subtle border
  - Monospace or system font for professional appearance
  - Each issue numbered (1, 2, 3, etc.)
  - Specific position names, amounts, and remediation steps included
  - Standard language from sendback template library
- Provide action buttons below message:
  - [Copy to Clipboard] - copies text, shows "✓ Copied!" confirmation
  - [Edit Message] - opens editable text area
  - [Send & Return] - shows success message, resets demo

**Pre-scripted Sendback** (Maplewood-Richmond Heights):
```
🤖 Here's your sendback message:

┌────────────────────────────────────────────────┐
│ 1) Goldberg is listed in source code 4 but    │
│ you are claiming costs for this position      │
│ ($7,196). Source code 4 indicates federal     │
│ funding, and you cannot claim federally       │
│ funded costs for SDAC. Either the source      │
│ code is incorrect, or you need to set the     │
│ "% state/local funds" columns to 0.00%.       │
│                                                │
│ 2) Position #12 needs an additional comment   │
│ explaining $0 in salary - e.g. "no services   │
│ billed," "vacant," etc.                       │
│                                                │
│ 3) Your justification for the 12.3% increase  │
│ in salaries mentions "general salary          │
│ increases" but doesn't explain the two new    │
│ positions added this quarter (Williams and    │
│ Lee, totaling $19,480). Please update your    │
│ justification to include this information.    │
│ Thank you!                                     │
└────────────────────────────────────────────────┘

[Copy to Clipboard] [Edit Message] [Send & Return]
```

**Trigger**: User requests sendback generation

**Visual State**: Sendback message with action buttons

#### FR-3.2: Copy to Clipboard Function
**Function**: Copy sendback text to system clipboard

**Requirements**:
- On click of [Copy to Clipboard]:
  - Copy full sendback text (without formatting box)
  - Show success feedback: "✓ Copied!" toast notification
  - Toast appears for 2 seconds then fades
  - Button temporarily changes to "✓ Copied" for 2 seconds
- Copied text should be plain text, properly formatted with line breaks

**Trigger**: User clicks [Copy to Clipboard] button

**Visual State**: Success confirmation displayed

---

### Scene 4: Cost Pool Validation (Optional - if time permits)

#### FR-4.1: Cost Pool Review
**Function**: Verify cost pool assignments for all positions

**Requirements**:
- Triggered by user asking "check cost pool placements" or similar
- Show "Reviewing cost pool assignments..." for 1 second
- Display summary of positions by cost pool:
  - List CP1 positions (if any) with job titles and function codes
  - List CP2 positions with breakdown by role type
  - Flag any potential misplacements
- Include historical context notes
- Color-code:
  - ✅ Green for correct placements
  - ⚠️ Yellow for questionable placements
  - ❌ Red for clear errors
- Provide action buttons: [View CP1/CP2 Rules] [Check Specific Position]

**Pre-scripted Output** (Maplewood-Richmond Heights - clean):
```
🤖 Reviewing cost pool assignments...

✅ COST POOL 2 (18 positions) - All Correct
   • 5 School Counselors (Function 2122)
   • 3 School Nurses (Function 2134)
   • 2 Social Workers (Function 2113)
   • 2 Assistant Principals (Function 2411)
   • 2 Alternative Ed Staff (Function 1193)
   • 4 Other administrative/support positions

⚠️ COST POOL 1 (0 positions)
   No CP1 eligible positions on this roster

📋 HISTORICAL NOTES
   • No cost pool issues in past 4 quarters
   • District consistently classifies positions correctly
   • No pending cost pool adjustments needed

[View CP1/CP2 Rules] [Check Specific Position]
```

**Trigger**: User requests cost pool check

**Visual State**: Cost pool summary in chat

---

## 4. USER INTERFACE SPECIFICATIONS

### 4.1 Chat Widget Layout

```
┌─────────────────────────────────────────┐
│ SDAC Assistant                    [─][×]│  ← Header with minimize/close
├─────────────────────────────────────────┤
│                                         │
│  [Chat message history scrolls here]    │  ← Scrollable message area
│                                         │
│  🤖 AI Message (left-aligned, blue bg)  │
│                                         │
│     User Message (right, gray bg) 💬    │
│                                         │
│  🤖 Another AI response                 │
│     [Action buttons if applicable]      │
│                                         │
│  ↓ Scroll for more ↓                   │
│                                         │
├─────────────────────────────────────────┤
│ Ask me anything... 💬             [▶]  │  ← Input area (fixed at bottom)
└─────────────────────────────────────────┘
```

**Dimensions**:
- Width: 400px
- Height: 600px (max)
- Position: Fixed bottom-right
- Margins: 24px from edges
- Z-index: High enough to appear above page content

**States**:
1. **Collapsed**: 60px circle with badge
2. **Expanded**: 400px × 600px panel
3. **Minimized**: Header bar only (if minimize clicked)

### 4.2 Message Types & Styling

#### AI Message Bubble
- Background: `#EFF6FF` (light blue)
- Text color: `#1F2937` (dark gray)
- Border radius: 12px (rounded on right, slight point on left)
- Padding: 12px 16px
- Max width: 85% of panel width
- Font size: 14px
- Line height: 1.5
- Alignment: Left
- Emoji prefix: 🤖

#### User Message Bubble
- Background: `#F3F4F6` (light gray)
- Text color: `#1F2937` (dark gray)
- Border radius: 12px (rounded on left, slight point on right)
- Padding: 12px 16px
- Max width: 85% of panel width
- Font size: 14px
- Line height: 1.5
- Alignment: Right

#### Issue Card (special formatting within AI message)
- Border-left: 4px solid (color based on priority)
  - High: `#EF4444` (red)
  - Medium: `#F59E0B` (amber)
  - Low: `#3B82F6` (blue)
- Background: `#FFFFFF` (white)
- Padding: 12px
- Margin: 8px 0
- Border radius: 6px
- Box shadow: `0 1px 3px rgba(0,0,0,0.1)`

#### Sendback Message Box
- Border: 1px solid `#D1D5DB` (light gray)
- Background: `#FFFFFF` (white)
- Padding: 16px
- Border radius: 8px
- Font family: Monospace or system font
- Font size: 13px
- Line height: 1.6
- Top/bottom corners: Rounded box appearance

### 4.3 Button Styles

#### Primary Action Button
- Background: `#3B82F6` (blue)
- Text color: `#FFFFFF` (white)
- Border: None
- Border radius: 8px
- Padding: 8px 16px
- Height: 36px
- Font size: 14px
- Font weight: 500 (medium)
- Hover: Darken background to `#2563EB`
- Active: Further darken to `#1D4ED8`

#### Secondary Action Button
- Background: `#FFFFFF` (white)
- Text color: `#3B82F6` (blue)
- Border: 1px solid `#3B82F6`
- Border radius: 8px
- Padding: 8px 16px
- Height: 36px
- Font size: 14px
- Font weight: 500
- Hover: Background to `#EFF6FF` (light blue)

#### Button Group Layout
- Horizontal arrangement
- 8px gap between buttons
- Centered or left-aligned depending on context

### 4.4 Loading & Status Indicators

#### Analyzing Animation
- Spinner: Rotating circle or dots animation
- Text: "Analyzing cost data report..."
- Color: `#3B82F6` (blue)
- Duration: 2 seconds
- Position: Center of chat panel

#### Typing Indicator
- Three dots bouncing animation
- Color: `#6B7280` (gray)
- Duration: 1 second before response appears
- Position: Left side (as if AI is "typing")

#### Success Toast
- Background: `#10B981` (green)
- Text color: `#FFFFFF` (white)
- Icon: ✓ (checkmark)
- Position: Top-center of chat panel
- Duration: 2 seconds
- Animation: Slide down, pause, fade out

### 4.5 Visual Hierarchy & Icons

**Priority Indicators**:
- ⚠️ High Priority (red)
- ⚡ Medium Priority (amber)
- ℹ️ Low Priority (blue)
- ✅ Validated/Correct (green)
- ❌ Error/Invalid (red)

**Contextual Icons**:
- 🤖 AI assistant
- 💬 Chat/messaging
- 📊 Comparison/charts
- 📋 History/clipboard
- 💡 Tip/recommendation
- ↑↓ Increase/decrease arrows

---

## 5. DEMO FLOW SCRIPT - ACT 2

### Preparation
- Load page with Maplewood-Richmond Heights Q3-2025 report displayed
- AI widget initially collapsed with "3" badge visible
- Have predetermined questions ready to type/click

### Timing: 5 Minutes Total

#### Minute 1: Proactive Detection
**Action**:
1. Point out the AI widget with badge showing "3"
2. Click widget to expand
3. Wait for 2-second "Analyzing..." animation
4. Show issue summary with categorized problems

**Script**:
> "Notice the AI assistant has already analyzed this report and found 3 potential issues. Let me show you what it found..."
> 
> [Click widget]
> 
> "In just 2 seconds, it's identified one critical issue with federal funding, and two moderate issues that need attention. This would normally take me 5-10 minutes of manual cross-referencing."

#### Minutes 2-3: Intelligent Q&A (1.5 min)
**Action**:
1. Type or click: "Why is their fringe differential so high?"
2. Show detailed AI analysis
3. Type or click: "What did we tell this district last quarter?"
4. Show historical context response

**Script**:
> "But it's not just about finding issues—I can ask it questions in plain English..."
> 
> [Type question about fringe differential]
> 
> "See how it not only explains the 8.7% increase but also points out that the justification is incomplete? It's doing analysis that would require me to pull up spreadsheets and calculate manually."
> 
> [Type question about history]
> 
> "And it remembers everything. It instantly recalls that this district was clean last quarter but had minor issues in Q1. No more searching through validation logs."

#### Minutes 3-4.5: Automated Sendback (1.5 min)
**Action**:
1. Click "Draft Sendback" or type the request
2. Wait 1 second for generation animation
3. Show formatted sendback message
4. Click "Copy to Clipboard"
5. Show success confirmation

**Script**:
> "Now here's the real time-saver. Instead of me crafting this feedback from scratch and making sure I use the right standard language..."
> 
> [Click Draft Sendback]
> 
> "The AI generates a professional, properly formatted sendback message using our approved templates. Position-specific, dollar amounts included, remediation steps clear."
> 
> [Click Copy]
> 
> "One click and it's ready to send. What used to take 5 minutes of careful writing now takes 5 seconds."

#### Minute 4.5-5: Comparison (if time permits)
**Action**:
1. Ask: "Compare this to last quarter"
2. Show detailed breakdown with metrics
3. Point out insights about new positions

**Script**:
> "And if I need deeper analysis..."
> 
> [Ask for comparison]
> 
> "It instantly compares to the same quarter last year, calculates all the differentials, identifies the new positions that explain the changes, and tells me exactly what's missing from their justification."

### Key Messages to Emphasize
1. **Speed**: "2 seconds vs. 15 minutes"
2. **Accuracy**: "Catches issues I might miss when juggling 5 documents"
3. **Consistency**: "Same high-quality feedback every time"
4. **Knowledge**: "Never forgets a district's history"

---

## 6. EDGE CASES & FALLBACKS

### 6.1 Unrecognized Questions
**Scenario**: User asks question not in pre-scripted library

**Behavior**:
- Display fallback response
- Provide list of suggested topics
- Show quick-action buttons for common tasks

**Example**:
```
🤖 I'm not sure about that. Try asking about:

• Source codes and function codes
• Cost pool placements  
• Justifications and differentials
• Comparisons to previous quarters
• District history

Or click a button below:
[Check Cost Pools] [Compare Quarters] [Draft Sendback]
```

### 6.2: Widget Closed Accidentally
**Scenario**: User clicks [×] close button

**Behavior**:
- Widget collapses back to badge state
- Badge still shows issue count
- Message history preserved if reopened within session
- Can reopen by clicking badge again

### 6.3: Demo Reset
**Scenario**: Need to restart demo for another viewer

**Behavior**:
- Provide hidden reset button or keyboard shortcut (e.g., Ctrl+R)
- Clears all chat history
- Returns widget to initial collapsed state
- Reloads with fresh "Analyzing..." sequence

---

## 7. SUCCESS METRICS (DEMO OUTCOMES)

### Audience Should Understand:
1. ✅ AI identifies issues automatically in seconds
2. ✅ Natural language Q&A provides instant expert knowledge
3. ✅ Sendback generation saves significant time and ensures consistency
4. ✅ Historical context is always available
5. ✅ Comparison analysis happens instantly

### Audience Should Feel:
- Excited about time savings potential
- Confident in AI accuracy
- Reassured that human review is still central
- Curious about implementation timeline

### Next Steps After Demo:
- Gather feedback on additional desired features
- Discuss integration approach
- Establish pilot timeline
- Define success metrics for production system

---

## 8. DELIVERABLES

### Prototype Assets
1. **HTML Page**: Mock TherapyLog cost data review interface
2. **Chat Widget**: Fully functional UI component
3. **Mock Data Files**: 2-3 pre-loaded cost reports with issues
4. **Response Library**: All Q&A pairs and sendback templates
5. **Demo Script**: Step-by-step presentation guide
6. **Reset Function**: Easy way to restart demo

### Documentation
1. User interaction guide (this document)
2. Visual design specifications
3. Demo presenter notes
4. FAQ for anticipated questions

---

## APPENDIX: PRE-SCRIPTED CONTENT LIBRARY

### A. Complete Sendback Messages

#### Sendback A: Maplewood (Moderate Issues)
```
1) Goldberg is listed in source code 4 but you are claiming costs for this position ($7,196). Source code 4 indicates federal funding, and you cannot claim federally funded costs for SDAC. Either the source code is incorrect, or you need to set the "% state/local funds" columns to 0.00%.

2) Position #12 needs an additional comment explaining $0 in salary - e.g. "no services billed," "vacant," etc.

3) Your justification for the 12.3% increase in salaries mentions "general salary increases" but doesn't explain the two new positions added this quarter (Williams and Lee, totaling $19,480). Please update your justification to include this information. Thank you!
```

#### Sendback B: Complex Issues (if needed for alternate demo)
```
1) Several positions have source code 4 with claimed costs. You cannot claim federally funded costs for SDAC. Either correct the source codes, or adjust the "% state/local funds" columns to back out federal funds.

2) Position #5 (Social Worker) appears to be in Cost Pool 1, but based on function code 2113, this should typically be Cost Pool 2 unless providing direct IEP-based services. Please verify and correct if needed.

3) Your justification doesn't adequately explain the 18% salary increase. Please provide specific details about new positions, filled vacancies, or other factors driving this change.

4) Three positions are missing comments explaining $0 in salary. Please add explanatory comments - e.g. "vacant," "no services billed," etc.
```

### B. Historical Context Variations

#### Well-Performing District (Maplewood)
```
📅 RECENT VALIDATION HISTORY

Q2-2025: ✅ Validated (no issues)
Q1-2025: ↩️ Sent back once (source codes, missing comments - corrected quickly)
Q4-2024: ✅ Validated (no issues)
Q3-2024: ✅ Validated (no issues)

📊 PERFORMANCE METRICS
• Validation rate: 75% (3 of 4 quarters)
• Avg. sendback count: 0.25 per quarter
• Response time: Excellent (2-3 days)

💡 RECOMMENDATION
This is a well-performing district. Issues are typically minor and quickly resolved.
```

#### Problem District (if needed)
```
📅 RECENT VALIDATION HISTORY

Q2-2025: ↩️ Sent back 3 times (federal funding, source codes)
Q1-2025: ↩️ Sent back 2 times (cost pools, missing data)
Q4-2024: ↩️ Sent back 2 times (source codes, justifications)

⚠️ RECURRING ISSUES
• Source code confusion (all 3 quarters)
• Federal funding not backed out
• Missing comments on vacant positions

💡 RECOMMENDATIONS
• Consider additional training
• Direct contact recommended
• Flag for quality improvement
```

---

**END OF FUNCTIONAL REQUIREMENTS**