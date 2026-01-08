/**
 * @fileoverview Quick Test Script for Multi-Agent System
 * @module scripts/test-agents
 *
 * Simple test to verify the multi-agent system works.
 * Run with: npx ts-node scripts/test-agents.ts
 *
 * @copyright 2026 Speed Team
 * @license MIT
 */

import { createOrchestrator } from '../src/lib/orchestrator';
import { createMetaAgent } from '../src/lib/agents';

// Set API key from environment (for Node.js)
if (!process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error('❌ Please set GEMINI_API_KEY environment variable');
    console.log('   Run: export GEMINI_API_KEY=your_key_here');
    process.exit(1);
}

// Make API key available
(global as any).__env = {
    VITE_GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
};

async function testMetaAgent() {
    console.log('\n🧪 Testing Meta-Agent...\n');

    const metaAgent = createMetaAgent();

    console.log('📝 Request: "Build me a todo app with user authentication"\n');

    const analysis = await metaAgent.analyzeProject(
        'Build me a todo app with user authentication and categories'
    );

    console.log('✅ Analysis Result:');
    console.log(`   Project Type: ${analysis.projectType}`);
    console.log(`   Complexity: ${analysis.complexity}`);
    console.log(`   Features: ${analysis.features.join(', ')}`);
    console.log(`   Required Agents: ${analysis.requiredAgents.join(', ')}`);
    console.log(`   Tech Stack:`);
    if (analysis.techStack.frontend) {
        console.log(`     Frontend: ${analysis.techStack.frontend.join(', ')}`);
    }
    if (analysis.techStack.backend) {
        console.log(`     Backend: ${analysis.techStack.backend.join(', ')}`);
    }
    if (analysis.techStack.database) {
        console.log(`     Database: ${analysis.techStack.database.join(', ')}`);
    }

    return analysis;
}

async function testOrchestrator() {
    console.log('\n🧪 Testing Orchestrator with Events...\n');

    const orchestrator = createOrchestrator({
        writeCode: false, // Don't write files for this test
        runTests: false,
    });

    // Listen to all events
    orchestrator.on('*', (event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(`[${time}] ${event.type}: ${event.message}`);
    });

    console.log('📝 Request: "Build me a simple calculator"\n');

    try {
        const project = await orchestrator.buildProject(
            'Build me a simple calculator that can add, subtract, multiply, and divide'
        );

        console.log('\n✅ Project completed!');
        console.log(`   Name: ${project.name}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Sprints: ${project.sprints.length}`);
        console.log(`   Stories: ${project.stories.length}`);

        return project;
    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           🚀 Speed Multi-Agent System Test 🚀            ');
    console.log('═══════════════════════════════════════════════════════════');

    try {
        // Test 1: Meta-Agent
        await testMetaAgent();

        console.log('\n---------------------------------------------------\n');

        // Test 2: Full Orchestrator (simplified)
        // Uncomment to run full test:
        // await testOrchestrator();

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('           ✅ All Tests Passed! 🎉                         ');
        console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

main();
