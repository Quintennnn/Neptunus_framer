# Insurance Boat Management System

## Project Overview
This is a Framer-based frontend for an insurance company's boat management system. The system serves three types of users:
- **Admins**: Full system management
- **Brokers/Editors**: Help users with policies and applications
- **Users/Organization owners**: Add boats to their insurance policies

## Backend Context
The backend is a CDK application located in `../APIs/neptunus/` with:
- Lambda functions for API endpoints
- DynamoDB for data storage
- Neptune API stack for the main architecture

Key backend files to reference:
@../APIs/neptunus/lambdas/
@../APIs/neptunus/dynamodb/
@../APIs/neptunus/neptunusAPI/

## Frontend Structure
- React/TypeScript components (.tsx files)
- Organized by feature: Changelog, Organization, Policy, User, boats
- Deployed to Framer (editing locally due to lack of AI in Framer IDE)

## Development Guidelines
- Follow existing React/TypeScript patterns
- Maintain consistency with current file structure
- Consider the three user roles when implementing features
- Remember this connects to insurance/boat policy backend APIs

## User Journey
Users (organization owners) manage their boat fleet and add boats to insurance policies, with brokers helping facilitate the process and admins overseeing the system.

## important import statement notice
whenever you import other ts files, in framer they all start with a capital. So by defualt, for example, you write the import as import xxx from utils. but it should be import xxx from Utils.tsx