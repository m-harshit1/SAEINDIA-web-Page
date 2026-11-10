import pandas as pd

df = pd.read_excel('c:/Users/Harshit/Desktop/SAE WB/sae-web-page V2/data/members.xlsx')
print(df.to_json(orient='records'))
