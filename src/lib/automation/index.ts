/**
 * Automation Module
 * 
 * Central export for all automation functionality:
 * - Workflow Engine: Orchestrate multi-step workflows
 * - Job Scheduler: Schedule and manage background jobs
 */

export { WorkflowEngine, type WorkflowExecution, type WorkflowStep, type WorkflowTemplate, type WorkflowStepTemplate } from './workflow-engine';
export { JobScheduler, type ScheduledJob, type JobExecution } from './job-scheduler';

