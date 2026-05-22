import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

// Temporary local file storage in development, or fallback to memory in serverless production
const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
const STATE_FILE_PATH = isLocal
  ? path.join(process.cwd(), 'node_modules', '.class_group_states.json')
  : '/tmp/class_group_states.json';

// In-memory fallback
let memoryStore: Record<string, any> = {};

function readStates(): Record<string, any> {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading state file:', e);
  }
  return memoryStore;
}

function writeStates(states: Record<string, any>) {
  try {
    memoryStore = states;
    // Try to write to file
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(states, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing state file:', e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { group } = req.query;
  const groupId = typeof group === 'string' ? group.trim() : '';

  if (!groupId) {
    return res.status(400).json({ error: 'Missing group parameter' });
  }

  const states = readStates();

  if (req.method === 'GET') {
    const groupState = states[groupId] || {
      step: 0,
      rolePool: [],
      roleVotes: {},
      classmates: [],
      assignments: {},
      students: {},
      isVotingStarted: false,
      hasVotedSimulated: false,
      classmateCount: 24,
      isAutoCapacity: true,
      customCapacity: {},
      matchDetails: {},
    };
    return res.status(200).json({ state: groupState });
  }

  if (req.method === 'POST') {
    const { state, action, student, studentId, voteUpdate } = req.body;

    if (!states[groupId]) {
      states[groupId] = {
        step: 0,
        rolePool: [],
        roleVotes: {},
        classmates: [],
        assignments: {},
        students: {},
        isVotingStarted: false,
        hasVotedSimulated: false,
        classmateCount: 24,
        isAutoCapacity: true,
        customCapacity: {},
        matchDetails: {},
      };
    }

    const groupState = states[groupId];

    if (action === 'update_state' && state) {
      // Teacher updates whole state
      states[groupId] = {
        ...groupState,
        ...state,
        students: state.students !== undefined ? state.students : groupState.students
      };
    } else if (action === 'suggest_role' && state?.role) {
      // Student suggests a new role
      const newRole = state.role;
      if (!Array.isArray(groupState.rolePool)) {
        groupState.rolePool = [];
      }
      if (!groupState.rolePool.some((r: any) => r.id === newRole.id)) {
        groupState.rolePool.push(newRole);
      }
    } else if (action === 'submit_student' && student) {
      // Student joins/updates profile or applications or pledges
      const sId = student.id;
      groupState.students[sId] = {
        ...groupState.students[sId],
        ...student,
      };
    } else if (action === 'submit_student_vote' && studentId && voteUpdate) {
      // Student votes
      const { userVotes, roleVotes } = voteUpdate;
      if (groupState.students[studentId]) {
        groupState.students[studentId].userVotes = userVotes;
      }
      groupState.roleVotes = {
        ...groupState.roleVotes,
        ...roleVotes,
      };
    } else if (action === 'send_compliment') {
      // Send a compliment to another student
      const { targetStudentId, compliment } = req.body;
      if (targetStudentId && compliment && groupState.students[targetStudentId]) {
        const targetStudent = groupState.students[targetStudentId];
        if (!Array.isArray(targetStudent.receivedCompliments)) {
          targetStudent.receivedCompliments = [];
        }
        targetStudent.receivedCompliments.push({
          id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          senderName: compliment.senderName,
          emoji: compliment.emoji,
          message: compliment.message,
          timestamp: Date.now()
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    writeStates(states);
    return res.status(200).json({ state: states[groupId] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
