import pandas as pd
import json

df = pd.read_excel('c:/Users/Harshit/Desktop/SAE WB/sae-web-page V2/data/members.xlsx')
# Keep only relevant columns for now to see what we have
# Assuming column names are like First Name, Last Name
members = df.to_dict(orient='records')
# Clean up nulls
cleaned = []
for m in members:
    cleaned.append({
        "name": f"{m.get('First Name', '')} {m.get('Last Name', '')}".strip(),
        "email": m.get('E-mail', '')
    })
print(json.dumps(cleaned))
