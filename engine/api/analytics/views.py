from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from analytics.valid.valid_xcs import Validator
from analytics.valid.valid_xcs import DataView
from analytics.valid.valid_xcs import ret_sheetnames


node_app_loc='C:\Users\dit\Documents\GitHub\Dynamic-Dashboard-2015\\'

def ret_fileobj(path):
	root_path = node_app_loc+path
	fobj = open(root_path,'rb')
	return fobj

@api_view(['POST'])
def valid_check(request):
	try:
		data = request.DATA
		identifier = data['identifier']
		fileobj = ret_fileobj(data['path'])
		sheetno = int(data['sheetno']) if data['extension']=='xls' else None
		validate = Validator.validate(identifier,data['type'],sheetno,fileobj,data['extension'])
		validate['identifier'] = identifier
		return Response(validate)
	except:
		return Response(status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def data_view(request):
	try:
		data = request.DATA
		return Response(DataView.filter_view(data['identifier'],int(data['limit']),int(data['skip']),data['filters']))
	except:
		return Response(status=status.HTTP_400_BAD_REQUEST)
@api_view(['POST'])
def chart_view(request):
	try:
		data = request.DATA
		return Response(DataView.chart_view(data['identifier'],data['datasetid']))
	except:
		return Response(status=status.HTTP_400_BAD_REQUEST)
@api_view(['POST'])
def sheet_names(request):
	try:
		data = request.DATA
		fileobj = ret_fileobj(data['path'])
		return Response(ret_sheetnames(fileobj))
	except:
		return Response(status=status.HTTP_400_BAD_REQUEST)