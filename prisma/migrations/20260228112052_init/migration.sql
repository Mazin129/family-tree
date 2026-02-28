-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ARABIC', 'ENGLISH', 'BOTH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('KHARTOUM', 'NORTHERN', 'NILE', 'RED_SEA', 'KASSALA', 'GEDAREF', 'BLUE_NILE', 'SINNAR', 'WHITE_NILE', 'NORTH_KORDOFAN', 'SOUTH_KORDOFAN', 'WEST_KORDOFAN', 'NORTH_DARFUR', 'SOUTH_DARFUR', 'EAST_DARFUR', 'CENTRAL_DARFUR', 'WEST_DARFUR', 'RIVER_NILE', 'GEZIRA', 'SENNAR', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('PUBLIC', 'COMMUNITY', 'FAMILY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('HISTORY', 'CULTURE', 'TRADITION', 'FOLKLORE', 'POETRY', 'MUSIC', 'FOOD', 'LANGUAGE', 'GENEALOGY', 'NEWS', 'GENERAL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AUDIO', 'VIDEO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "HeritageCategory" AS ENUM ('CLOTHING', 'MUSIC', 'DANCE', 'FOOD', 'CRAFT', 'ARCHITECTURE', 'LANGUAGE', 'POETRY', 'PROVERB', 'CEREMONY', 'RELIGION', 'OTHER');

-- CreateEnum
CREATE TYPE "AIInsightType" AS ENUM ('DUPLICATE_DETECTION', 'MISSING_LINK_SUGGESTION', 'RELATIONSHIP_VALIDATION', 'LINEAGE_PATTERN', 'HISTORICAL_INSIGHT', 'TRIBE_INFERENCE', 'MIGRATION_PATTERN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COLLABORATION_INVITE', 'TREE_UPDATE', 'AI_INSIGHT', 'COMMUNITY_REPLY', 'SYSTEM', 'WELCOME');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "nameArabic" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "preferredLanguage" "Language" NOT NULL DEFAULT 'ARABIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "bioArabic" TEXT,
    "tribe" TEXT,
    "region" "Region",
    "country" TEXT DEFAULT 'Sudan',
    "diasporaCity" TEXT,
    "diasporaCountry" TEXT,
    "phone" TEXT,
    "birthYear" INTEGER,
    "occupation" TEXT,
    "linkedinUrl" TEXT,
    "bannerImage" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameArabic" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "tribe" TEXT,
    "clan" TEXT,
    "region" "Region",
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "neo4jTreeId" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRelationship" (
    "id" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeMember" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT,
    "neo4jPersonId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fullNameArabic" TEXT,
    "nickname" TEXT,
    "nicknameArabic" TEXT,
    "fatherName" TEXT,
    "grandfatherName" TEXT,
    "tribe" TEXT,
    "clan" TEXT,
    "lineage" TEXT,
    "gender" "Gender" NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "birthYear" INTEGER,
    "birthDate" TIMESTAMP(3),
    "deathYear" INTEGER,
    "deathDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "birthRegion" "Region",
    "deathPlace" TEXT,
    "bio" TEXT,
    "bioArabic" TEXT,
    "occupation" TEXT,
    "occupationArabic" TEXT,
    "photo" TEXT,
    "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'FAMILY',
    "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyTreeTag" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "FamilyTreeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeCollaboration" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TreeCollaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleArabic" TEXT,
    "content" TEXT NOT NULL,
    "contentAr" TEXT,
    "category" "PostCategory" NOT NULL,
    "tribe" TEXT,
    "region" "Region",
    "tags" TEXT[],
    "images" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "OralHistory" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleArabic" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "narrator" TEXT,
    "region" "Region",
    "tribe" TEXT,
    "year" INTEGER,
    "duration" INTEGER,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "transcript" TEXT,
    "transcriptAr" TEXT,
    "language" "Language" NOT NULL DEFAULT 'ARABIC',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OralHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeritageItem" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleArabic" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "category" "HeritageCategory" NOT NULL,
    "region" "Region",
    "tribe" TEXT,
    "period" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeritageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "treeId" TEXT,
    "memberId" TEXT,
    "insightType" "AIInsightType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "isAccepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateAlert" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "memberId1" TEXT NOT NULL,
    "memberId2" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultTreePrivacy" "PrivacyLevel" NOT NULL DEFAULT 'FAMILY',
    "showProfile" BOOLEAN NOT NULL DEFAULT true,
    "showInSearch" BOOLEAN NOT NULL DEFAULT true,
    "allowCollabInvites" BOOLEAN NOT NULL DEFAULT true,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "exportRequested" BOOLEAN NOT NULL DEFAULT false,
    "deletionRequested" BOOLEAN NOT NULL DEFAULT false,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_neo4jTreeId_key" ON "FamilyTree"("neo4jTreeId");

-- CreateIndex
CREATE INDEX "FamilyTree_ownerId_idx" ON "FamilyTree"("ownerId");

-- CreateIndex
CREATE INDEX "MemberRelationship_fromMemberId_idx" ON "MemberRelationship"("fromMemberId");

-- CreateIndex
CREATE INDEX "MemberRelationship_toMemberId_idx" ON "MemberRelationship"("toMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRelationship_fromMemberId_toMemberId_type_key" ON "MemberRelationship"("fromMemberId", "toMemberId", "type");

-- CreateIndex
CREATE INDEX "TreeMember_treeId_idx" ON "TreeMember"("treeId");

-- CreateIndex
CREATE INDEX "TreeMember_neo4jPersonId_idx" ON "TreeMember"("neo4jPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTreeTag_treeId_tag_key" ON "FamilyTreeTag"("treeId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "TreeCollaboration_treeId_userId_key" ON "TreeCollaboration"("treeId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "CommunityPost_category_idx" ON "CommunityPost"("category");

-- CreateIndex
CREATE INDEX "OralHistory_uploaderId_idx" ON "OralHistory"("uploaderId");

-- CreateIndex
CREATE INDEX "OralHistory_tribe_idx" ON "OralHistory"("tribe");

-- CreateIndex
CREATE INDEX "AIInsight_treeId_idx" ON "AIInsight"("treeId");

-- CreateIndex
CREATE INDEX "DuplicateAlert_treeId_idx" ON "DuplicateAlert"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRelationship" ADD CONSTRAINT "MemberRelationship_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "TreeMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRelationship" ADD CONSTRAINT "MemberRelationship_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "TreeMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTreeTag" ADD CONSTRAINT "FamilyTreeTag_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeCollaboration" ADD CONSTRAINT "TreeCollaboration_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeCollaboration" ADD CONSTRAINT "TreeCollaboration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralHistory" ADD CONSTRAINT "OralHistory_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeritageItem" ADD CONSTRAINT "HeritageItem_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
