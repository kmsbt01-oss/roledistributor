export interface Student {
  id: string;
  name: string;
  isUser: boolean;
  isReal?: boolean;
  applications: {
    first: string;
    second: string;
    third: string;
  };
  suitability: Record<string, number>; // roleId -> score (0 to 100)
}

export interface MatchResult {
  assignments: Record<string, string>; // studentId -> roleId
  unassignedStudents: string[]; // List of student IDs that couldn't get their 1-3 choices
  details: Record<string, { roleId: string; choiceRank: 'first' | 'second' | 'third' | 'assigned_other'; score: number }>;
  roleCapacities: Record<string, number>; // The capacities calculated/used for each role
}

/**
 * Calculates capacities for each role dynamically based on student application choices.
 * - Ensures that total capacity is at least equal to the number of students.
 * - Roles with higher student demand (1st, 2nd, 3rd choices) get proportionally more capacity.
 * - Every role gets a base capacity of 1 (unless the number of roles exceeds students).
 */
export const calculateDynamicCapacities = (
  students: Array<{ applications: { first: string; second: string; third: string } }>,
  roles: Array<{ id: string; name: string }>,
  customCapacity?: Record<string, number>
): Record<string, number> => {
  const roleCapacities: Record<string, number> = {};
  
  // Calculate demand points for each role
  const roleDemand: Record<string, number> = {};
  roles.forEach(role => {
    roleDemand[role.id] = 0;
  });
  
  students.forEach(student => {
    const { first, second, third } = student.applications;
    if (first && roleDemand[first] !== undefined) roleDemand[first] += 3;
    if (second && roleDemand[second] !== undefined) roleDemand[second] += 2;
    if (third && roleDemand[third] !== undefined) roleDemand[third] += 1;
  });

  const baseCapacity = roles.length > students.length ? 0 : 1;
  let totalCapacity = 0;

  roles.forEach(role => {
    const cap = customCapacity?.[role.id] !== undefined 
      ? customCapacity[role.id] 
      : baseCapacity;
    roleCapacities[role.id] = cap;
    totalCapacity += cap;
  });

  // Distribute remaining capacity shortfall to the most demanded roles first
  if (totalCapacity < students.length) {
    let shortfall = students.length - totalCapacity;
    const sortedRolesByDemand = [...roles].sort((a, b) => (roleDemand[b.id] || 0) - (roleDemand[a.id] || 0));
    
    let index = 0;
    while (shortfall > 0 && sortedRolesByDemand.length > 0) {
      const roleId = sortedRolesByDemand[index % sortedRolesByDemand.length].id;
      roleCapacities[roleId]++;
      shortfall--;
      index++;
    }
  }

  return roleCapacities;
};

export const runMatchAlgorithm = (
  students: Student[],
  roles: Array<{ id: string; name: string }>,
  customCapacity?: Record<string, number>
): MatchResult => {
  const assignments: Record<string, string> = {};
  const details: Record<string, { roleId: string; choiceRank: 'first' | 'second' | 'third' | 'assigned_other'; score: number }> = {};
  
  // 1. Calculate capacities dynamically
  const roleCapacities = calculateDynamicCapacities(students, roles, customCapacity);

  // Track assigned counts
  const roleAssignmentsCount: Record<string, number> = {};
  roles.forEach(role => {
    roleAssignmentsCount[role.id] = 0;
  });

  // 2. Generate all bids (choice bids for students)
  interface Bid {
    studentId: string;
    roleId: string;
    choiceRank: 'first' | 'second' | 'third';
    score: number;
  }

  const bids: Bid[] = [];

  students.forEach(student => {
    const { first, second, third } = student.applications;
    const realBoost = student.isReal ? 50000 : 0;
    
    // Add bid for 1st choice
    if (first) {
      const suitabilityScore = student.suitability[first] || 50;
      const userBoost = student.isUser ? 50 : 0;
      const tieBreaker = Math.random() * 10;
      
      bids.push({
        studentId: student.id,
        roleId: first,
        choiceRank: 'first',
        score: 1000 + (suitabilityScore * 3) + userBoost + realBoost + tieBreaker
      });
    }

    // Add bid for 2nd choice
    if (second) {
      const suitabilityScore = student.suitability[second] || 50;
      const userBoost = student.isUser ? 50 : 0;
      const tieBreaker = Math.random() * 10;

      bids.push({
        studentId: student.id,
        roleId: second,
        choiceRank: 'second',
        score: 500 + (suitabilityScore * 3) + userBoost + realBoost + tieBreaker
      });
    }

    // Add bid for 3rd choice
    if (third) {
      const suitabilityScore = student.suitability[third] || 50;
      const userBoost = student.isUser ? 50 : 0;
      const tieBreaker = Math.random() * 10;

      bids.push({
        studentId: student.id,
        roleId: third,
        choiceRank: 'third',
        score: 200 + (suitabilityScore * 3) + userBoost + realBoost + tieBreaker
      });
    }
  });

  // 3. Sort bids by score descending
  bids.sort((a, b) => b.score - a.score);

  // 4. Assign roles based on bids
  bids.forEach(bid => {
    // If student is already assigned, skip
    if (assignments[bid.studentId]) return;

    // If role is full, skip
    const currentCount = roleAssignmentsCount[bid.roleId];
    const capacity = roleCapacities[bid.roleId];
    if (currentCount >= capacity) return;

    // Assign!
    assignments[bid.studentId] = bid.roleId;
    roleAssignmentsCount[bid.roleId]++;
    details[bid.studentId] = {
      roleId: bid.roleId,
      choiceRank: bid.choiceRank,
      score: bid.score
    };
  });

  // 5. Handle unassigned students (those whose 1-3 choices were full)
  const unassignedStudents: string[] = [];
  
  students.forEach(student => {
    if (!assignments[student.id]) {
      unassignedStudents.push(student.id);
    }
  });

  // Assign remaining students to roles that have vacancies
  unassignedStudents.forEach(studentId => {
    const student = students.find(s => s.id === studentId)!;
    
    // Find vacant roles
    const vacantRoles = roles.filter(role => {
      return roleAssignmentsCount[role.id] < roleCapacities[role.id];
    });

    if (vacantRoles.length > 0) {
      // Sort vacant roles by student's suitability score for that role
      vacantRoles.sort((a, b) => {
        const suitabilityA = student.suitability[a.id] || 50;
        const suitabilityB = student.suitability[b.id] || 50;
        return suitabilityB - suitabilityA;
      });

      const selectedRole = vacantRoles[0];
      assignments[studentId] = selectedRole.id;
      roleAssignmentsCount[selectedRole.id]++;
      details[studentId] = {
        roleId: selectedRole.id,
        choiceRank: 'assigned_other',
        score: student.suitability[selectedRole.id] || 50
      };
    } else {
      // If absolutely no roles have vacancies (should not happen if capacities are calculated correctly),
      // assign to the role with the absolute lowest current capacity ratio, ignoring limit.
      const sortedRoles = [...roles].sort((a, b) => {
        const countA = roleAssignmentsCount[a.id];
        const countB = roleAssignmentsCount[b.id];
        return countA - countB;
      });
      const selectedRole = sortedRoles[0];
      assignments[studentId] = selectedRole.id;
      roleAssignmentsCount[selectedRole.id]++;
      details[studentId] = {
        roleId: selectedRole.id,
        choiceRank: 'assigned_other',
        score: student.suitability[selectedRole.id] || 50
      };
    }
  });

  return {
    assignments,
    unassignedStudents,
    details,
    roleCapacities
  };
};

