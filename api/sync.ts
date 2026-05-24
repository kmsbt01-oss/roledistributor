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

// KVdb.io Bucket details (Uses a highly unique name to store and share States in Serverless)
const KVDB_BUCKET = 'roledist_v1_5524';
const KVDB_BASE_URL = `https://kvdb.io/${KVDB_BUCKET}`;

// Helper to read all states locally (from file or memory)
function readStatesLocal(): Record<string, any> {
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

// Helper to write all states locally (to file and memory)
function writeStatesLocal(states: Record<string, any>) {
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

// Read group state with remote KVdb.io and local fallback
async function getGroupState(groupId: string): Promise<any> {
  // 1. Try to read from KVdb.io
  try {
    const res = await fetch(`${KVDB_BASE_URL}/${encodeURIComponent(groupId)}`, {
      signal: AbortSignal.timeout(2000), // 2 seconds timeout
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (e) {
    console.warn(`[API Sync] KVdb.io read failed for ${groupId}, falling back to local:`, (e as any).message);
  }

  // 2. Fallback to local
  const localStates = readStatesLocal();
  return localStates[groupId];
}

// Save group state with remote KVdb.io and local double-write
async function saveGroupState(groupId: string, groupState: any) {
  // Compression: Strip large simulated classmate suitability and reasons to fit within KVdb.io limits (16KB)
  if (groupState && Array.isArray(groupState.classmates)) {
    groupState.classmates = groupState.classmates.map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      applications: c.applications || { first: '', second: '', third: '' },
    }));
  }

  // 1. Write locally (immediate, reliable fallback)
  const localStates = readStatesLocal();
  localStates[groupId] = groupState;
  writeStatesLocal(localStates);

  // 2. Push to KVdb.io in the background
  try {
    await fetch(`${KVDB_BASE_URL}/${encodeURIComponent(groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupState),
      signal: AbortSignal.timeout(2500),
    });
  } catch (e) {
    console.error(`[API Sync] KVdb.io write failed for ${groupId}:`, (e as any).message);
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

  // Retrieve groupState using our async helper
  let groupState = await getGroupState(groupId);

  if (req.method === 'GET') {
    if (!groupState) {
      groupState = {
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
        assignmentsCapacities: {},
      };
    }
    return res.status(200).json({ state: groupState });
  }

  if (req.method === 'POST') {
    const { state, action, student, studentId, voteUpdate } = req.body;

    if (!groupState) {
      groupState = {
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
        assignmentsCapacities: {},
      };
    }

    if (action === 'update_state' && state) {
      // Teacher updates whole state
      groupState = {
        ...groupState,
        ...state,
        students: state.students !== undefined ? state.students : groupState.students,
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
      if (!groupState.students) {
        groupState.students = {};
      }
      groupState.students[sId] = {
        ...groupState.students[sId],
        ...student,
      };
    } else if (action === 'submit_student_vote' && studentId && voteUpdate) {
      // Student votes
      const { userVotes, roleVotes } = voteUpdate;
      if (groupState.students && groupState.students[studentId]) {
        groupState.students[studentId].userVotes = userVotes;
      }
      if (!groupState.roleVotes) {
        groupState.roleVotes = {};
      }
      groupState.roleVotes = {
        ...groupState.roleVotes,
        ...roleVotes,
      };
    } else if (action === 'send_compliment') {
      // Send a compliment to another student
      const { targetStudentId, compliment } = req.body;
      if (targetStudentId && compliment && groupState.students && groupState.students[targetStudentId]) {
        const targetStudent = groupState.students[targetStudentId];
        if (!Array.isArray(targetStudent.receivedCompliments)) {
          targetStudent.receivedCompliments = [];
        }
        targetStudent.receivedCompliments.push({
          id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          senderName: compliment.senderName,
          emoji: compliment.emoji,
          message: compliment.message,
          timestamp: Date.now(),
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Write back to remote KV and local fallback
    await saveGroupState(groupId, groupState);
    return res.status(200).json({ state: groupState });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
