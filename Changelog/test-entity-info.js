// Test file to verify the entity info logic

// Mock data that would come from changelog entries
const mockChangelogEntries = [
    {
        id: "changelog-1",
        entityId: "insured-object-123",
        sourceTableTag: "insuredobject",
        changes: {
            merkBoot: { S: "Beneteau" },
            typeBoot: { S: "First 35" },
            organization: { S: "Marina Rotterdam" },
            bootnummer: { S: "NL-001-A" }
        }
    },
    {
        id: "changelog-2", 
        entityId: "policy-456",
        sourceTableTag: "policy",
        changes: {
            polisnummer: { S: "POL-2024-001" },
            organization: { S: "Marina Amsterdam" }
        }
    },
    {
        id: "changelog-3",
        entityId: "org-789",
        sourceTableTag: "organization", 
        changes: {
            name: { S: "Marina Den Haag" }
        }
    }
];

// Mock the formatDynamoDBValue function
function formatDynamoDBValue(value) {
    if (value === null || value === undefined) return null;
    
    if (typeof value === "object" && value !== null) {
        if (value.S !== undefined) return value.S; // String
        if (value.N !== undefined) return Number(value.N); // Number
        if (value.BOOL !== undefined) return value.BOOL; // Boolean
        if (value.NULL !== undefined) return null; // Null
        
        // Recursively format object properties
        const formatted = {};
        for (const [key, val] of Object.entries(value)) {
            formatted[key] = formatDynamoDBValue(val);
        }
        return formatted;
    }
    
    return value;
}

// Test the entity display logic
function getEntityDisplayInfo(entityId, sourceTableTag, changes) {
    const formattedChanges = formatDynamoDBValue(changes);
    let displayName = "Unknown";
    let organization = "";
    let entityType = sourceTableTag.toLowerCase();
    
    switch (entityType) {
        case "insuredobject":
            if (formattedChanges?.merkBoot || formattedChanges?.typeBoot) {
                const boatName = formattedChanges.merkBoot || formattedChanges.typeBoot || "";
                const boatNumber = formattedChanges.bootnummer || "";
                displayName = boatName ? 
                    (boatNumber ? `${boatName} (${boatNumber})` : boatName) :
                    (boatNumber ? `Boot ${boatNumber}` : "Boot");
            } else if (formattedChanges?.trailerRegistratienummer) {
                displayName = `Trailer (${formattedChanges.trailerRegistratienummer})`;
            } else if (formattedChanges?.motorMerk) {
                displayName = formattedChanges.motorMerk;
            }
            organization = formattedChanges?.organization || "";
            break;
            
        case "policy":
            displayName = formattedChanges?.polisnummer || `Polis ${entityId.slice(-8)}`;
            organization = formattedChanges?.organization || "";
            break;
            
        case "organization":
            displayName = formattedChanges?.name || `Organisatie ${entityId.slice(-8)}`;
            organization = displayName;
            break;
    }
    
    return { displayName, organization, entityType };
}

// Test the logic
console.log("Testing entity info extraction:");
console.log("=================================");

mockChangelogEntries.forEach((entry, index) => {
    const result = getEntityDisplayInfo(entry.entityId, entry.sourceTableTag, entry.changes);
    console.log(`Entry ${index + 1}:`);
    console.log(`  Entity ID: ${entry.entityId}`);
    console.log(`  Source: ${entry.sourceTableTag}`);
    console.log(`  Display Name: ${result.displayName}`);
    console.log(`  Organization: ${result.organization}`);
    console.log(`  Type: ${result.entityType}`);
    console.log("");
});
