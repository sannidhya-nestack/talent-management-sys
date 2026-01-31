/**
 * Team Management Service
 *
 * Provides operations for managing installation teams, team members, availability, and skills.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getUserById } from './users';

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  skills: string[];
  certifications: string[];
  availability: {
    startDate: Date;
    endDate: Date | null; // null means ongoing availability
  }[];
  isActive: boolean;
}

export interface InstallationTeam {
  id: string;
  name: string;
  members: string[]; // Array of team member IDs
  installationId: string;
  assignedDate: Date;
  notes?: string;
}

export interface CreateTeamMemberData {
  userId: string;
  skills?: string[];
  certifications?: string[];
  availability?: TeamMember['availability'];
}

export interface CreateTeamData {
  name: string;
  members: string[];
  installationId: string;
  notes?: string;
}

/**
 * Get all team members
 */
export async function getTeamMembers(options?: {
  activeOnly?: boolean;
  skills?: string[];
}): Promise<TeamMember[]> {
  let query = collections.teamMembers() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.activeOnly) {
    query = query.where('isActive', '==', true);
  }

  const snapshot = await query.get();
  const members = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);

      return {
        id: doc.id,
        userId: data.userId,
        name: user?.displayName || 'Unknown',
        email: user?.email || '',
        skills: (data.skills as string[]) || [],
        certifications: (data.certifications as string[]) || [],
        availability: ((data.availability as TeamMember['availability']) || []).map((avail) => ({
          startDate: timestampToDate(avail.startDate) || new Date(),
          endDate: avail.endDate ? timestampToDate(avail.endDate) : null,
        })),
        isActive: data.isActive !== undefined ? data.isActive : true,
      };
    })
  );

  // Filter by skills if specified
  if (options?.skills && options.skills.length > 0) {
    return members.filter((member) =>
      options.skills!.some((skill) => member.skills.includes(skill))
    );
  }

  return members;
}

/**
 * Get a team member by ID
 */
export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const doc = await collections.teamMembers().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  const user = await getUserById(data.userId);

  return {
    id: doc.id,
    userId: data.userId,
    name: user?.displayName || 'Unknown',
    email: user?.email || '',
    skills: (data.skills as string[]) || [],
    certifications: (data.certifications as string[]) || [],
    availability: ((data.availability as TeamMember['availability']) || []).map((avail) => ({
      startDate: timestampToDate(avail.startDate) || new Date(),
      endDate: avail.endDate ? timestampToDate(avail.endDate) : null,
    })),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
}

/**
 * Create or update a team member
 */
export async function upsertTeamMember(
  userId: string,
  data: Partial<CreateTeamMemberData>
): Promise<TeamMember> {
  // Check if team member already exists for this user
  const existingSnapshot = await collections
    .teamMembers()
    .where('userId', '==', userId)
    .limit(1)
    .get();

  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const teamMemberData = {
    userId,
    skills: data.skills || [],
    certifications: data.certifications || [],
    availability: data.availability || [],
    isActive: data.isActive !== undefined ? data.isActive : true,
    updatedAt: serverTimestamp(),
  };

  if (existingSnapshot.empty) {
    // Create new team member
    const id = generateId();
    await collections.teamMembers().doc(id).set({
      ...teamMemberData,
      id,
      createdAt: serverTimestamp(),
    });

    return {
      id,
      userId,
      name: user.displayName,
      email: user.email,
      skills: teamMemberData.skills,
      certifications: teamMemberData.certifications,
      availability: teamMemberData.availability.map((avail) => ({
        startDate: timestampToDate(avail.startDate) || new Date(),
        endDate: avail.endDate ? timestampToDate(avail.endDate) : null,
      })),
      isActive: teamMemberData.isActive,
    };
  } else {
    // Update existing team member
    const doc = existingSnapshot.docs[0];
    await collections.teamMembers().doc(doc.id).update(teamMemberData);

    return {
      id: doc.id,
      userId,
      name: user.displayName,
      email: user.email,
      skills: teamMemberData.skills,
      certifications: teamMemberData.certifications,
      availability: teamMemberData.availability.map((avail) => ({
        startDate: timestampToDate(avail.startDate) || new Date(),
        endDate: avail.endDate ? timestampToDate(avail.endDate) : null,
      })),
      isActive: teamMemberData.isActive,
    };
  }
}

/**
 * Get teams for an installation
 */
export async function getInstallationTeams(installationId: string): Promise<InstallationTeam[]> {
  const snapshot = await collections
    .installationTeams()
    .where('installationId', '==', installationId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      members: (data.members as string[]) || [],
      installationId: data.installationId,
      assignedDate: timestampToDate(data.assignedDate) || new Date(),
      notes: data.notes || undefined,
    };
  });
}

/**
 * Create a team for an installation
 */
export async function createInstallationTeam(data: CreateTeamData): Promise<InstallationTeam> {
  const id = generateId();
  const teamData = {
    id,
    name: data.name,
    members: data.members,
    installationId: data.installationId,
    assignedDate: serverTimestamp(),
    notes: data.notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.installationTeams().doc(id).set(teamData);

  return {
    id,
    name: data.name,
    members: data.members,
    installationId: data.installationId,
    assignedDate: new Date(),
    notes: data.notes,
  };
}

/**
 * Check team member availability for a date range
 */
export async function checkAvailability(
  memberId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const member = await getTeamMemberById(memberId);
  if (!member || !member.isActive) {
    return false;
  }

  // Check if member has availability that covers the requested date range
  return member.availability.some((avail) => {
    const availStart = avail.startDate.getTime();
    const availEnd = avail.endDate ? avail.endDate.getTime() : Infinity;
    const requestStart = startDate.getTime();
    const requestEnd = endDate.getTime();

    return requestStart >= availStart && requestEnd <= availEnd;
  });
}

/**
 * Get available team members for a date range
 */
export async function getAvailableTeamMembers(
  startDate: Date,
  endDate: Date,
  requiredSkills?: string[]
): Promise<TeamMember[]> {
  const members = await getTeamMembers({
    activeOnly: true,
    skills: requiredSkills,
  });

  const available: TeamMember[] = [];

  for (const member of members) {
    const isAvailable = await checkAvailability(member.id, startDate, endDate);
    if (isAvailable) {
      available.push(member);
    }
  }

  return available;
}
